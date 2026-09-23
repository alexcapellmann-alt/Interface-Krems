# PROJEKTLOG.md

Laufende Weiterentwicklungs-Entscheidungen, die nicht (mehr) über neue Masterprompt-Versionen
dokumentiert werden (siehe Masterprompt, Status-Absatz). Neueste Einträge oben.

---

## 2026-09-23 (33) – Führungen, Teil 2c: Korrekturen, „Führung fortsetzen", Abschlussbildschirm

**Auftrag (Kurzfassung):** Korrekturblock (K1-K4) aus der Browserprüfung von
2b, danach „Führung fortsetzen" (schwebender Button, sessionStorage) und
der Abschlussbildschirm. `CLAUDE.md` gelesen und bestätigt vor Beginn.

### Korrekturblock

**K1 (lesbare Typbezeichnungen):** `js/utils/datensatzAufruf.js`s neu
exportierte `TYP_ANZEIGE`-Konstante (Urkunde/Bürgerbuch/
Verlassenschaftsinventar/Bestand/Person/Abbildung) - EINE Stelle, von
`belegDarstellung.js`s Quellenzeile UND den Archiv-Link-Aria-Labels
gemeinsam genutzt (vorher: zwei getrennte, inhaltsgleiche Konstanten in
verschiedenen Dateien - jetzt konsolidiert).

**K2 (lesbares Datumsformat):** `belegDarstellung.js`s neue lokale
`formatiereDatum()` - im Projekt existierte keine wiederverwendbare
Hilfsfunktion dafür (`kalenderHeatmap.js`' `MONATSNAMEN_VOLL` ist lokal/
nicht exportiert und arbeitet auf bereits geparsten Werten, nicht auf
rohen Datumstexten). `urkunde` nutzt jetzt `datum_normiert`
("JJJJ_MM_TT", extra für diesen Zweck angelegt, siehe SCHEMA.md Abschnitt
1) statt des rohen `datum`-Feldes (historische Schreibweisen wie römische
Monatszahlen). Getestet mit `StAK_162408_908_reg`/`datum_normiert=1624_08_00`
(Monat bekannt, Tag unbekannt) → "August 1624", keine Ergänzung/Ratung des
fehlenden Tages.

**K3 (Unsicherheit vs. Fehler):** `belegDarstellung.js`s
`baueUnsicherheitAbsatz()` baut jetzt einen eingeklappten ⚠-Button
("Angaben unsicher") statt eines fett-roten Absatzes - Text erst nach
Aufklappen sichtbar (`aria-expanded`, nativer `<button>` daher automatisch
per Maus/Touch/Tastatur bedienbar). Eigene, neue Warnfarbe
`--fuehrung-unsicher`/`--fuehrung-unsicher-bg` (components.css) - bewusst
weder `--unsicher` (rot, App-weite Fehlerkonvention) noch
`--fuehrung-fehler` (amber, Prüfregel-Konvention) wiederverwendet, sonst
wäre die geforderte Unterscheidung nicht mehr gegeben. Mit einer
temporären zweiten (defekten) Beleg-ID an Station 2 nebeneinander getestet
(Screenshot in der Selbstauskunft) - eindeutig unterscheidbar (Farbe,
Symbol, Beschriftung, Form). sidebar.js selbst nicht angefasst (Nicht-Ziel)
- Unsicherheitsdarstellung anderer Module unverändert.

**K4 (`launch.json`):** startet jetzt den Cache-freien Testserver aus
`CLAUDE.md` (Skript weiterhin außerhalb des Repositorys). Per direktem
Ausführen des in `launch.json` hinterlegten Befehls UND `curl` verifiziert
(`Cache-Control: no-store` bestätigt) - die session-eigene
`preview_start`-Verdrahtung zeigte dabei noch einen zwischengespeicherten
Stand von Port 8834 aus einer früheren Sitzung (reines Werkzeug-Caching
dieser Sitzung, kein Fehler in `launch.json` selbst).

### Punkt 1: „Führung fortsetzen" (`js/fuehrungen/fuehrungFortsetzen.js`)

App-weit einmalig an `document.body` verankert (`js/core/app.js`, nach
`starteRouter()`), Zustand in `sessionStorage` (ein Schlüssel je Sitzung -
eine neue Führung ersetzt automatisch eine vorherige pausierte). Nur ein
Klick auf einen Belegs-/Vertiefungslink löst das Speichern aus (delegierter
Listener in `fuehrungStation.js`, Auftrag wörtlich - normale
Pfeilnavigation tut es bewusst nicht).

**Zwei live gefundene und behobene Fehler:**
1. `speichereZustand()` rief synchron `aktualisiere()` auf - dessen
   „stehen wir schon auf der pausierten Station?"-Prüfung griff dabei noch
   gegen die ALTE Route (`<a href>`s Hashwechsel läuft erst NACH allen
   click-Handlern), der frisch gespeicherte Zustand löschte sich dadurch
   sofort wieder selbst. Behoben: kein Aufruf mehr dort, der bereits
   registrierte `hashchange`-Listener übernimmt das mit der dann aktuellen
   Route ohnehin.
2. CSS-Spezifitätsproblem: `.fuehrung-fortsetzen { display: flex; ... }`
   (Autoren-Regel) gewann gegen des Browsers eigene `[hidden]{display:none}`
   -Regel (gleiche Spezifität, Autoren-Regeln schlagen UA-Regeln im
   Cascade unabhängig von Spezifität) - `wurzel.hidden = true` (JS) blieb
   dadurch wirkungslos sichtbar. Behoben mit einer expliziten
   `.fuehrung-fortsetzen[hidden] { display: none; }`-Regel.

Eckenwechsel-Button (WCAG-2.5.7-Alternative zum Ziehen) UND Ziehen per
Pointer Events (deckt Maus UND Touch gleichermaßen ab) beide implementiert
und einzeln live getestet (Tastatur: Fokus + Enter). Position
(Ecke ODER freie Pixel-Koordinaten) in einem zweiten sessionStorage-
Schlüssel, überlebt Neuladen. Vollständiger Ablauf (Station 1 verlassen →
Button erscheint → Tab-Wechsel, bleibt → Ziehen ohne Auslösen → Eckenwechsel
→ Neuladen, Position bleibt → Klick führt zu Station 1 → Schließen → Galerie
zeigt „Fortsetzen bei Station 1") live durchgespielt, siehe Selbstauskunft.

**Beobachtung, kein Widerspruch zum Auftrag:** Auf Mobil deckt eine
vollbildbreite offene Sidebar (`z-index:500`) den Fortsetzen-Button
(`z-index:60`) ab - die Sidebar-eigenen Bedienelemente (u. a. „×") bleiben
dabei uneingeschränkt bedienbar (der Button verdeckt also KEINE
Bedienelemente, wie im Auftrag gefordert), der Fortsetzen-Button selbst ist
in diesem einen Moment aber nicht erreichbar, bis die Sidebar geschlossen
wird - danach unverändert an seiner Position wieder da. Ein höherer
z-index für den Button hätte das Problem umgekehrt (er würde dann seinerseits
die Sidebar-Schaltflächen verdecken) - deshalb bewusst nicht geändert,
hier nur vermerkt.

Rechts unten als Ausgangsposition kollidierte in keiner geprüften Ansicht
mit bestehenden Bedienelementen (Desktop: Zeitachse/Parallelkoordinaten/
Treemap/Personenliste/Bestand-Galerie/Führungsstation-eigene Navigationssäule
- letztere mit knappem, aber nachweislich freiem Abstand bei 1366×768
geprüft) - keine Rückmeldung nötig.

### Punkt 2: Abschlussbildschirm (`js/fuehrungen/fuehrungAbschluss.js`)

Route `#fuehrungen/<id>/ende`, in `app.js`' `aktualisiereFuehrungenAnsicht()`
vor der `station_nr`-Auflösung abgezweigt. Kopfbereich/Navigationssäule/
bildschirmfüllendes Verhalten bewusst EIGENSTÄNDIG nachgebaut (dieselben
CSS-Klassen wie die Stationsansicht, aber `fuehrungStation.js`s
`baueKopf()`/`passeGroesseAn()` sind dort nicht exportiert und fest auf
eine echte `station` zugeschnitten - keine Änderung an bestehenden
Funktionssignaturen, Nicht-Ziel). „Selbst erkunden" dedupliziert über alle
Stationen hinweg (nach aufgelöstem `href`), „Zum Weiterlesen" löst
`weiterlesen` gegen `literatur.csv` auf (siehe SCHEMA.md Abschnitt 12) -
mit temporärer Testkopie (zwei Einträge + eine unbekannte ID) vollständig
verifiziert, siehe Selbstauskunft für Screenshots. Erreichen des
Abschlussbildschirms löscht den Fortsetzen-Zustand (`loescheZustand()` in
`render()`).

**Kein Block „Mitmachen"** (Nicht-Ziel). Vorgesehene Stelle für einen
späteren Auftrag: zwischen „Selbst erkunden" und „Zum Weiterlesen" in
`fuehrungAbschluss.js`s `render()` (zwischen den beiden `if (…) inhalt.
appendChild(…)`-Aufrufen) - inhaltlich eigener Block, keine der beiden
bestehenden Funktionen wiederverwenden (andere Interaktionsart als reine
Links).

### Redaktioneller Hinweis (Auftrag wörtlich vermerkt)

Die Texte in `unsicherheit_anmerkung` (mehrere Quell-CSVs) enthalten teils
interne Arbeitsvermerke (Dateinamen wie „urkunden_gesamt.xlsx", IDs, der
Vermerk „Nicht zusammengeführt") - für eine öffentliche Anzeige müssten
diese Texte redaktionell überarbeitet werden. Die Texte selbst wurden dafür
NICHT geändert (Nicht-Ziel).

---

## 2026-09-23 (32) – Führungen, Teil 2b: Belege öffnen, Vertiefungslinks

**Auftrag (Kurzfassung):** Freigabe nach 3a-2 - Punkt 3 (Bürgerbuch-Detailansicht)
entfällt vollständig, `buergerbuch`-Belege verlinken stattdessen auf die
Personenliste über die `personen_id` des Eintrags. Punkt 4-7 umgesetzt:
zentraler, typbasierter Datensatzaufruf per URL, Archiv-Links in der
Führung, Vertiefungslinks, Dokumentation.

### Abdeckung `buergerbuch` → Personenliste

Geprüft (Python-Skript gegen `data/buergerbuch.csv`/`data/personenliste.csv`):
**alle 2791 Bürgerbucheinträge** haben eine `personen_id`, die in
`personenliste.csv` auffindbar ist (0 fehlend, 0 nicht auffindbar) - jeder
Bürgerbuch-Beleg in einer Führung bekommt daher ausnahmslos einen Link,
keine Sonderbehandlung für fehlende Zuordnung nötig.

### Zentrale Konfiguration (`js/utils/datensatzAufruf.js`)

`ZUORDNUNG` (eine Stelle) verknüpft Typ → Router-Segmente → Öffnen-Funktion,
zur Laufzeit gegen `archivalienRegistry.js` geprüft (fehlt die Ansicht dort,
sichtbarer Hinweis statt Fehler - "Führungen hängen nicht an einzelnen
Ansichten", Auftrag wörtlich). Live getestet: ein testweise auf
`ansichtId: 'nichtVorhandeneAnsicht'` gesetzter Eintrag erzeugte
zuverlässig den Hinweis „Datensatztyp „urkunde" wird nicht unterstützt.",
kein Konsolenfehler - danach zurückgesetzt (siehe `git diff --stat` unten,
0 Zeilen Differenz in dieser Datei).

**Öffnen-Funktionen je Zielmodul** (alle < 20 Zeilen, rufen ausschließlich
bestehende interne Funktionen auf, keine duplizierte Logik):

| Modul | `oeffneDatensatz(id)` ruft auf |
|---|---|
| `zeitachse.js` | `oeffneSidebar(record)` - derselbe Wrapper wie der Punkt-Klick-Handler |
| `parallelKoordinaten.js` | `schalteAuswahl(record)` - Sidebar UND Linien-Hervorhebung in einem Aufruf |
| `treemap.js` | `wechsleZuKategorie(kategorie)` dann `waehleBestandAus(knoten)` - dieselben zwei Funktionen wie ein Nutzer-Doppelklick (erst Kategorie, dann Bestand) |
| `personenliste.js` | dieselbe Suchfeld-Filterung (`zeichneTabelle()`) plus `zeigePersonenNennungen()` - identisch zum Zeilen-Klick |

**Gefundener und behobener Fehler während der Entwicklung:** `ermittleZielFuerTyp()`
reichte für `bestand` zunächst `eintrag.typArchivalien` (immer `undefined`,
da `bestand` kein solches Feld hat) an derselben Positions-Stelle weiter,
an der `ermittleAnsicht()` für den `'bestand'`-Zweig die `ansichtId`
erwartet - dadurch schlug JEDER `bestand`-Aufruf fehl ("nicht
unterstützt"). Live beim Testen gefunden (Treemap zeigte den
Nicht-unterstützt-Hinweis statt zu öffnen), behoben durch einen eigenen
Aufrufzweig für `tab==='bestand'` in `ermittleZielFuerTyp()`.

### Punkt 5+6: Führungen-Integration

`belegDarstellung.js`s Quellenzeile bekommt ein eigenes `<a>` (NICHT der
ganze Belegbereich klickbar - Urkundenfoto-Klick öffnet weiterhin die
Lightbox, live geprüft). `fuehrungenDaten.js`s neue `parseVertiefung()`
nutzt `datensatzAufruf.js`s `ermittleVertiefungsLink()` als neue Prüfregel
(Pfad nicht in der Registry → `fuehrung-fehler`-Hinweis statt Link) -
dieselbe Stelle, die auch den Datensatzaufruf validiert, fängt dadurch auch
später entfernte Vertiefungsziele ab.

### Offene Punkte (bestätigt/ergänzt)

- `filter.entity` wird vom Router gesetzt, aber von keinem Modul
  ausgelesen (Eintrag 29) - unverändert, nicht Teil dieses Auftrags.
- `zielSignatur` bleibt stillgelegt, nicht wiederbelebt.
- Bürgerbuch-Personennetzwerk wird voraussichtlich entfernt - bis dahin
  nicht angepasst (Auftrag wörtlich).
- Eigenständige Bürgerbuch-Liste (Option 2 aus Eintrag 30) bleibt ein
  möglicher späterer Auftrag, mit `js/viz/regestenKachelraster.js` als
  strukturellem Vorbild (durchsuchbares Kachelraster/Liste einzelner
  Einträge einer Quelle).
- Sieben lokale `WARN_SYMBOL`-Kopien (siehe Eintrag zu
  `unsicherheitHinweis.js`) weiterhin nicht auf eine gemeinsame Utility
  zusammengeführt - unverändert, nicht Teil dieses Auftrags.

---

## 2026-09-23 (31) – Führungen, Teil 2b, Punkt 3a-2: Abdeckungsprüfung Personennetzwerk (Pause)

**Auftrag (Kurzfassung):** Nach der Freigabe von Option 1 (Ego-Ansicht des
Personennetzwerks um eine Bürgerbuch-Eintragsliste erweitern) zunächst
prüfen, wie viele Bürgerbucheinträge über ihre `personen_id` überhaupt
einen Knoten mit Ego-Ansicht im Personennetzwerk haben. **Keine
Codeänderung in diesem Eintrag.**

### Methode

`js/utils/buergerbuchZeit.js`' `baueBuergschaftsNetzwerk()` (Zeile 223-257)
gelesen: ein Knoten entsteht NUR für eine `personen_id`, wenn entweder (a)
ihr eigener Eintrag ein nicht-leeres `buergen_id` hat (Zeile 238-239: `if
(ids.length === 0) return;` - Einträge ganz ohne Bürgen werden komplett
übersprungen, bekommen für sich selbst KEINEN Knoten), oder (b) die
`personen_id` irgendwo in einem `buergen_id`-Feld eines ANDEREN Eintrags
als Bürge auftaucht. Gegen `data/buergerbuch.csv` (2791 Zeilen) exakt
nachgebaut und ausgezählt (`buergen_id` pipe-getrennt, wie in Punkt 3b
beschrieben).

### Ergebnis

| Gruppe | Erreichbar (Knoten mit Ego-Ansicht vorhanden) | Anteil |
|---|---|---|
| Alle Einträge (2791) | 630 | 22,6 % |
| mit `buergen_id` (330) | 330 | **100 %** |
| ohne `buergen_id` (2461) | 300 | 12,2 % |

**Nicht alle Einträge sind erreichbar** - genau der im Auftrag vorgesehene
Pausen-Fall. Jeder Eintrag MIT Bürgen ist erreichbar (seine eigene
`personen_id` erzeugt ja selbst den Knoten). Der überwältigende Rest - die
2461 Einträge ohne Bürgen, 87,8 % davon (2161 Einträge) - hat **keinen**
Knoten im Personennetzwerk und wäre über eine reine Ego-Ansichts-Anbindung
nicht erreichbar; die einzigen erreichbaren „bürgenlosen" Einträge (300)
sind zufällige Treffer, deren Person zusätzlich bei einem ANDEREN Eintrag
als Bürge auftritt.

**Einordnung:** Das Personennetzwerk zeigt naturgemäß nur das
Bürgschafts-Beziehungsgeflecht - die meisten Bürgerbucheinträge haben aber
gar keinen dokumentierten Bürgen und liegen damit strukturell außerhalb
dessen, was diese Visualisierung abbildet. Das ist kein Fehler des Moduls,
sondern eine Diskrepanz zwischen „Bürgerbuch als vollständige Liste" und
„Personennetzwerk als Beziehungsausschnitt".

### Pause

Damit wartet diese Sitzung auf eine erneute Entscheidung, bevor mit 3b
fortgefahren wird - z. B.: Option 1 dennoch wie geplant umsetzen (deckt dann
nur die 22,6 % mit Bürgen-Bezug ab, für den Rest bliebe `buergerbuch`
vorerst nur per direktem `?datensatz=`-Aufruf ohne Einstieg aus einer
Visualisierung erreichbar - konsistent mit der bereits im PROJEKTLOG
vermerkten Option 3), Option 1 mit Option 2 (eigenständige Liste) kombinieren,
oder ein anderes Vorgehen.

---

## 2026-09-23 (30) – Führungen, Teil 2b, Punkt 2+3a: alter Ordner geprüft, Bürgerbuch-Zielansicht blockiert (Pause)

**Auftrag (Kurzfassung):** Vor der Umsetzung von Teil 2b Punkt 2 (alten
Arbeitsordner auf verlorene `CLAUDE.md`/Anweisungsdateien prüfen) und
Punkt 3a (welche der vier Bürgerbuch-Ansichten stellen Einzeleinträge dar)
klären. **Keine Codeänderung in diesem Eintrag.**

### Punkt 2 - alter Arbeitsordner (`C:\Users\ali\Desktop\GI_2.0`)

Keine `CLAUDE.md` gefunden (`ls` → „No such file or directory"). Kein
`AGENTS.md`, kein `README.md`. Einziger Treffer: `.claude\launch.json`
(205 Bytes) - reine Dev-Server-Konfiguration (`gi2-test-server`, `python -m
http.server 8834`), inhaltsgleich mit dem bereits bekannten, alten Server-
Start (jetzt durch den Testserver aus `CLAUDE.md` abgelöst) - **keine
Projektregeln, kein Anweisungstext**. Nichts zusammenzuführen, direkt mit
Punkt 3 fortgefahren (Akzeptanzkriterium: "falls nichts gefunden wird,
direkt mit Punkt 3 fortfahren").

### Punkt 3a - stellt eine der vier Bürgerbuch-Ansichten Einzeleinträge dar?

Geprüft per Quellcode-Lektüre (D3-`.data()`-Bindung: bindet die Ansicht an
einzelne `records` oder an aggregierte Bins/Gruppen?) und `grep` auf jeden
`.on('click', ...)`-Handler:

| Ansicht | Woran ist ein visuelles Element gebunden? | Klick öffnet | Einzeleintrag? |
|---|---|---|---|
| `trellis.js` | `bins` (Jahrzehnt × Wirtschaftssektor, `zelle.eintraege` ist eine interne Liste, nirgends einzeln angeklickt) | kein Klick-Handler vorhanden (nur Hover-Tooltip) | **Nein** |
| `bumpChart.js` | `bins`/Rang je Sektor und Jahrzehnt | Klick auf eine Serie friert/hebt den ganzen **Wirtschaftssektor** hervor (`schalteHervorhebung(d.sektor)`, Zeile 310) | **Nein** |
| `streamgraph.js` | `bins`/gestapelte Fläche je Sektor | Klick friert/hebt den ganzen **Wirtschaftssektor** hervor (`schalteHervorhebung(d.key)`, Zeile 214) | **Nein** |
| `personennetzwerk.js` | Knoten = **Personen** (aggregiert über `baueBuergschaftsNetzwerk()`, `js/utils/buergerbuchZeit.js`), Kanten = aggregierte Bürgschafts-Paare (können mehrere Bürgerbuch-Zeilen zusammenfassen) | Klick wählt eine **Person** aus (`waehlePerson(d.id)`, Zeile 109/132) - Ego-Ansicht um diese Person, kein einzelner Bürgerbuch-Eintrag | **Nein** |

**Ergebnis: Keine der vier bestehenden Bürgerbuch-Ansichten stellt einen
einzelnen Bürgerbuch-Eintrag als eigenes, anklickbares Element dar** - alle
vier operieren ausschließlich auf Aggregat-Ebene (Jahrzehnt×Sektor-Bins
oder Personen-Knoten/-Kanten). Damit ist die von Punkt 3c geforderte
Auswahl „die Ansicht, in der ein einzelner Eintrag am klarsten erkennbar
ist" **nicht möglich** - es gibt keinen Kandidaten.

Genau der im Auftrag selbst vorgesehene Fall: „Falls keine der vier
Ansichten einzelne Einträge darstellt: melden und pausieren. Dann gibt es
keine sinnvolle Zielansicht, und ich entscheide über das weitere Vorgehen."

**Optionen, unpräjudiziert zur Entscheidung vorgelegt** (keine davon
umgesetzt):
1. Eine der vier bestehenden Ansichten um eine Einzeleintrag-Ebene
   erweitern (z. B. `personennetzwerk.js`s Ego-Ansicht um eine Liste der
   zugrunde liegenden Bürgerbuch-Zeilen dieser Person ergänzen - ähnlich
   `vermoegensschichtung.js`s `oeffneDetailliste()`-Muster, dort aber ohne
   Weiterklick auf Einzeldetail).
2. Eine neue, eigenständige Bürgerbuch-Ansicht (Liste/Kachelraster nach dem
   Muster von `regestenKachelraster.js`) als fünfte Ansicht ergänzen - über
   den heutigen Auftrag hinausgehend.
3. Die neue Sidebar aus Punkt 3b trotzdem bauen (eigenständig sinnvoll,
   schließt die Lücke "kein Bürgerbucheintrag ist einzeln aufrufbar"), aber
   OHNE Anbindung an eine bestehende Visualisierung - nur über
   `?datensatz=buergerbuch:<id>` direkt erreichbar (Punkt 4), ohne
   Einstiegspunkt aus einer Übersichts-Visualisierung heraus. Damit wäre
   Punkt 3c (Anbindung) für `buergerbuch` ersatzlos entfallen, bis eine der
   Optionen 1/2 umgesetzt ist.

### Pause

Punkt 2 und 3a sind abgeschlossen, keine Codeänderung vorgenommen. Diese
Sitzung wartet jetzt auf die Entscheidung des Auftraggebers zur
Bürgerbuch-Zielansicht (eine der drei Optionen oben oder eine andere),
bevor mit Punkt 3b fortgefahren wird. Punkt 4-7 hängen an dieser
Entscheidung (URL-Zuordnung für `typ:'buergerbuch'`, Anbindung in Punkt 5).

---

## 2026-09-23 (29) – Führungen, Teil 2b, Punkt 1: Erhebung und Zuordnung (Pause bis Freigabe)

**Auftrag (Kurzfassung):** Vor der eigentlichen Umsetzung von Teil 2b (Belege
öffnen/Vertiefungslinks) klären: warum `zielSignatur` stillgelegt wurde, in
welcher bestehenden Ansicht jeder Belegtyp geöffnet werden soll, ein
URL-Format vorschlagen, nötige Eingriffe benennen. **Keine Codeänderung in
diesem Punkt** - danach Pause bis zur Freigabe der Zuordnung.

### Warum ist `zielSignatur` stillgelegt?

Kein Bug, keine unerwünschte Nebenwirkung (kein Beleg für "unerwartetes
Scrollen" oder "Konflikte mit Filtern" in CHANGELOG/PROJEKTLOG gefunden,
gezielt gesucht) - reine **architektonische Ablösung**: `state.js`'
`zielSignatur` (`js/core/state.js:78-84`) + `router.js`' `navigiereZu()`
wurden ursprünglich von `kalenderHeatmap.js`' `navigiereZuKachel()`
verwendet, um beim Klick auf eine Urkunde in einer Kalendertag-Liste zum
Regesten-Kachelraster zu navigieren und dort die Zielurkunde zu isolieren
(Suchbegriff setzen → filtern → `karte.click()` → `scrollIntoView()`,
`js/viz/regestenKachelraster.js:762-800`). Der Auftrag „Sidebar-Liste –
Regest-Vorschauzeile & Inline-Detailansicht" (CHANGELOG Zeile 4027-4036)
hat diesen Navigationsweg **ersatzlos** entfernt, weil Klick auf einen
Listeneintrag seither die volle Detailansicht **innerhalb derselben
Sidebar** öffnet (keine Navigation mehr nötig) - eigener Kommentar dazu in
`js/viz/kalenderHeatmap.js:124-136`: „entfällt ersatzlos … wird von hier
aus schlicht nicht mehr befüllt". Der `zielSignatur`-Mechanismus selbst war
zum Zeitpunkt seiner letzten Nutzung „live verifiziert" funktionsfähig
(CHANGELOG Zeile 5169-5177) - er wurde nicht wegen eines Problems
abgeschaltet, sondern weil sein einziger Aufrufer wegfiel.

**Strukturelle Einschränkung, die für Teil 2b tatsächlich relevant ist**
(bereits in Eintrag 24, Punkt 0.3 vermerkt): `zielSignatur` ist rein
In-Memory, nicht in der URL gespiegelt, und als Einmal-Kanal konzipiert
(`clearZielSignatur()` beim ersten Konsum) - für eine direkt eingegebene
oder geteilte URL (Akzeptanzkriterium aus Punkt 2 des aktuellen Auftrags)
von vornherein ungeeignet. Kein Übernahme-Risiko, weil Teil 2b ohnehin
einen neuen, URL-basierten Mechanismus braucht.

### Zielansicht je Belegtyp

Ermittelt per `grep` auf alle Aufrufer von `baueSidebarGeruest()`/
`oeffneSidebar()`/`zeigeUrkundenSidebar()`/`zeigeUrkundenDetail()` in
`js/viz/*.js` und Sichtung, ob der jeweilige Klick-Handler eine Detailansicht
**eines einzelnen Datensatzes** öffnet (nicht nur eine gruppierte Liste).

| Typ | Vorgeschlagene Zielansicht (Routerpfad) | Was dort geöffnet wird | Hervorhebung möglich? | Begründung |
|---|---|---|---|---|
| `urkunde` | `#visualisierungen/urkunden/zeitachse` | Urkunden-Sidebar mit Fotogalerie (`zeigeUrkundenDetail()` → `baueUrkundenDetailInhalt()`, dieselbe Funktion, die `belegDarstellung.js` für den `urkunde`-Belegtyp bereits wiederverwendet) | Nein (heute nicht implementiert - `instanz.ausgewaehltesRecord` wird nur nachgeführt, keine visuelle Markierung des Punkts selbst) | Jeder Punkt trägt bereits das volle Record inkl. `signatur` und ein `aria-label` „Urkunde ‹signatur›, …" (`zeitachse.js:268,752`) - direktester Ein-Datensatz-zu-ein-Element-Bezug aller Kandidaten. Alternative: `dotPlot.js` (dieselbe Funktion, dieselbe Eignung) - Zeitachse bevorzugt, weil sie bereits die Referenzimplementierung für `baueUrkundenDetailInhalt()` ist und in dieser Sitzung bereits ausführlich regressionsgeprüft wurde. |
| `buergerbuch` | **keine vorhanden** | - | - | Grep auf `baueSidebarGeruest`/`oeffneSidebar`/`Sidebar` in allen vier Bürgerbuch-Ansichten (`trellis.js`, `bumpChart.js`, `personennetzwerk.js`, `streamgraph.js`) ergibt **null Treffer** - keine öffnet heute irgendeine Detailansicht für einen einzelnen Bürgerbucheintrag. Die Regel „Ansicht, in der die Sidebar heute schon per Klick geöffnet werden kann" ist für diesen Typ **nicht erfüllbar**, ohne eine der vier Ansichten zu erweitern. Rückmeldung nötig, siehe unten. |
| `inventar` | `#visualisierungen/verlassenschaften/parallelKoordinaten` | Sidebar mit synthetischem Detail-Record (Name/Beruf/Ort/Jahr + Achsenwerte, `oeffneDetail()` → `oeffneSidebar()`, `js/viz/parallelKoordinaten.js:291-293`) | Ja - Klick fixiert zusätzlich die Linien-Hervorhebung (`schalteAuswahl()`, Dateikopf-Kommentar Zeile 35-37) | Einzige der vier Verlassenschaften-Ansichten, die einen EINZELNEN Datensatz öffnet. `vermoegensschichtung.js` öffnet nur gruppierte Listen (Vermögensgruppe×Jahrzehnt, `oeffneDetailliste()`, geprüft: die Listeneinträge selbst sind nicht anklickbar) - ungeeignet. `korrelationsmatrix.js`/`marimekkoVerlassenschaften.js` haben keinen Sidebar-Aufruf. |
| `bestand` | `#bestand/treemap` | Bestand-Sidebar (`oeffneSidebar()` → `baueSidebarInhalt()`, `js/viz/treemap.js:283-286`) | Ja - Klick markiert den Knoten zusätzlich per Rahmenfarbe (`istAusgewaehlt`/`AUSWAHL_FARBE`, `treemap.js:505-516`) | Primäransicht für Bestand, unter den fünf Kandidaten (treemap/sunburst/icicle/circlePacking/ganttDiagramm - alle fünf öffnen laut Grep dieselbe generische Bestand-Sidebar) die mit zusätzlicher Hervorhebung UND geringstem Navigationsaufwand (kein vorheriges Hineinzoomen in eine Kategorie nötig für die Kategorie-Ebene - **Einschränkung**: ein einzelner Bestand-Knoten ist laut Code erst nach Klick auf seine Kategorie sichtbar/anklickbar, d. h. das Öffnen eines bestimmten Bestands per ID bräuchte einen zusätzlichen, automatischen Kategoriewechsel vor dem eigentlichen Klick - siehe Eingriffe unten). |
| `person` | `#visualisierungen/personen/personenliste` | Sidebar „Alle Einträge zu dieser Person" (Urkunden-/Bürgerbuch-Nennungen, `zeigePersonenNennungen()`, `js/viz/personenliste.js:639-644`) | Nein (keine Zeilen-Hervorhebung implementiert) | Einzige Personen-Ansicht mit Klick-zu-Detail für einen einzelnen Personen-Datensatz; Liste durchsucht bereits heute auch nach `personen_id` (`personenliste.js:504`) - dieselbe Isolieren-dann-Klicken-Struktur wie beim `zielSignatur`-Vorbild. |

**Wichtiger Befund zur Auftrags-Prämisse „Personenfilter über
entity_typ/entity_wert":** Das im Auftrag selbst schon vorausgesetzte
„Personenfilter"-Ziel existiert in dieser Form **nicht**. `router.js` parst
`entity_typ`/`entity_wert` zwar generisch und ruft `state.js`'
`setFilterEntity()` auf (`router.js:56-57`) - aber **kein einziges Modul in
`js/viz/` liest `getZustand().filter.entity` je wieder aus** (grep über
alle `js/viz/*.js`: null Treffer). Der einzige heutige Schreiber ist
`regestenKachelraster.js`' `baueEntityButtons()` (Klick auf einen
Personen-/Ortsnamen INNERHALB eines Urkunden-Datensatzes setzt den Filter),
aber niemand konsumiert ihn. `filter.entity` ist also selbst momentan
**toter, aber verdrahteter Zustand** - das strukturelle Gegenstück zu
`zielSignatur` (dort: verdrahtet und tot durch Wegfall des Aufrufers; hier:
verdrahtet und tot, weil nie ein Verbraucher gebaut wurde). Für `person`
schlage ich stattdessen `personenliste.js`s **eigenen, lokalen**
Suchmechanismus (`instanz.suchbegriff`, oben in der Tabelle) vor - dieser
filtert bereits nachweislich nach `personen_id` und ist funktional näher am
gesuchten Verhalten. Bitte im Rahmen der Freigabe entscheiden, ob (a)
`personenliste.js`s lokaler Suchmechanismus verwendet wird (kleinerer
Eingriff, s.u.) oder (b) `filter.entity` für `typ:'person'` erstmals
tatsächlich verdrahtet werden soll (größerer Eingriff, würde zusätzlich
`personenliste.js` betreffen und faktisch entscheiden, `filter.entity`
erstmals produktiv zu nutzen - über den heutigen Auftrag hinausgehend).

### URL-Format (Vorschlag)

Neuer Query-Parameter `datensatz`, Format `<typ>:<id>` - dieselbe
Typ-Bezeichnung wie in `fuehrungenDaten.js`' `BELEG_QUELLEN` (`urkunde`/
`buergerbuch`/`inventar`/`bestand`/`person`) und dieselben ID-Felder, die
dort bereits als `idFeld` hinterlegt sind (`signatur`/`id`/`id`/`kuerzel`/
`personen_id`):

```
#visualisierungen/urkunden/zeitachse?datensatz=urkunde:StaAKr-0022
#bestand/treemap?datensatz=bestand:StaAKr-B12
#visualisierungen/personen/personenliste?datensatz=person:P-0451
```

Begründung:
- Eigener Parametername (nicht `entity_typ`/`entity_wert`) - unterscheidet
  sich bewusst vom (heute unbenutzten) dauerhaften Kontext-Filter, ist aber
  strukturell gleich einfach zu erweitern; beide können nebeneinander in
  derselben URL stehen (`router.js`' `URLSearchParams`-Parsing ist bereits
  parameter-agnostisch, liest nur die ihm bekannten Schlüssel heraus).
- `<typ>:<id>` statt zwei separaten Parametern (`datensatz_typ`/
  `datensatz_id`) - kürzer, und die ID selbst kann laut Datenlage in keinem
  der fünf Typen einen `:` enthalten (stichprobenartig gegen die
  tatsächlichen ID-Spalten geprüft).
- Für Stufe 3 (Zustandsübergabe) erweiterbar, ohne dieses Format zu ändern:
  weitere Parameter (z. B. `zeitraum=1500-1550`, `filter=kategorie:Kauf`)
  würden als zusätzliche, eigene Query-Parameter neben `datensatz` stehen -
  `router.js`' `parseHash()` bräuchte dafür nur weitere `params.get(...)`-
  Zeilen, keine Änderung am `datensatz`-Format selbst.

### Eingriffe (Dateien außerhalb der Führungen-Dateien)

| Datei | Nötige Änderung | Begründung |
|---|---|---|
| `js/core/router.js` | `parseHash()`: `datensatz` aus den Query-Parametern lesen und in `route` aufnehmen; `baueHash()`: optionalen `datensatz`-Parameter mit ausgeben | Zentrale Stelle, die JEDE URL parst/baut - ohne diese Änderung ist der neue Parameter für keine Ansicht erreichbar |
| `js/core/state.js` | Keine zwingende Änderung, wenn `datensatzAufruf.js` den Parameter direkt aus `router.js`' `aktuelleRoute()` liest statt ihn im globalen Zustand zu spiegeln (analog dazu, dass auch `zielSignatur` bewusst NICHT in der URL stand - hier ist es umgekehrt: der Parameter soll NUR in der URL stehen, nicht zusätzlich im flüchtigen `zustand`-Objekt landen, sonst entsteht zwei-Quellen-Unklarheit) | reine Leseinfrastruktur, kein neuer State nötig |
| `js/utils/sidebar.js` | Keine Änderung nötig für `urkunde`/`bestand`/`inventar` (bestehende `oeffneSidebar()`/`zeigeUrkundenDetail()` werden nur von außen mit einem per ID gefundenen Record aufgerufen, nicht verändert) | bestehende exportierte Funktionen reichen aus |
| `js/viz/zeitachse.js` | Neue schmale, exportierte Funktion (z. B. `oeffneUrkundeNachSignatur(signatur)`), die den passenden `d.record` in den bereits geladenen `records` sucht und denselben Codepfad wie der bestehende Klick-Handler auslöst | heute öffnet ausschließlich der interne DOM-Klick-Handler die Sidebar - kein Aufruf von außen möglich |
| `js/viz/parallelKoordinaten.js` | Analog: neue exportierte Funktion, die per `id` den Record findet und `oeffneDetail()` aufruft | dito |
| `js/viz/treemap.js` | Analog, ZUSÄTZLICH: falls der Ziel-Bestand nicht in der aktuell sichtbaren obersten Ebene liegt, muss die Funktion zuerst programmatisch `wechsleZuKategorie()` der richtigen Kategorie auslösen, bevor `waehleBestandAus()` aufgerufen werden kann (zweistufige Navigation, dasselbe Prinzip wie `regestenKachelraster.js`' Suchbegriff-vor-Klick beim `zielSignatur`-Vorbild) | Bestand-Knoten sind erst nach Kategorie-Wahl im DOM vorhanden |
| `js/viz/personenliste.js` (falls Option a, lokaler Suchmechanismus) | Neue exportierte Funktion analog `filterleiste.js`' `setzeSuchbegriff()` - z. B. `oeffnePersonNachId(id)`, setzt `instanz.suchbegriff`, filtert, klickt die passende Zeile | heute nur intern über das Sucheingabefeld erreichbar |
| `js/viz/personenliste.js` (falls Option b, `filter.entity` erstmals verdrahten) | Zusätzlich: `render()` müsste `getZustand().filter.entity` lesen und bei `typ==='person'` denselben Isolier-Mechanismus auslösen | erstmalige Verdrahtung eines bisher folgenlosen Zustandsfelds |
| Neu: `js/utils/datensatzAufruf.js` | ID-Lookup (typbasiert gegen die jeweils bereits geladenen Daten der Zielansicht) + Aufruf der jeweiligen neuen `oeffne...`-Funktion; unbekannte ID → sichtbarer, schließbarer Hinweis | zentraler, typbasierter Mechanismus laut Auftrag, statt Einzelimplementierung pro Modul |
| `js/core/app.js` | Ruft nach dem Laden der jeweiligen Zielansicht `datensatzAufruf.js`' zentrale Öffnen-Funktion auf, falls die Route einen `datensatz`-Parameter trägt | einzige Stelle, die weiß, wann eine Ansicht fertig geladen/gerendert ist |
| `docs/SCHEMA.md` | URL-Format, Typ→Zielansicht-Tabelle, Hinweis auf spätere Stufe-3-Erweiterung dokumentieren | laut Betroffene Dateien/Punkt 5 |

**Zusätzlich, unabhängig von der obigen Tabelle:** `js/utils/sidebar.js`
könnte OHNE die obigen modul-eigenen `oeffne...`-Funktionen auskommen, wenn
stattdessen jedes Modul stattdessen eine bereits offene Sidebar-Instanz
direkt von `datensatzAufruf.js` aus ansteuern ließe - das wurde hier bewusst
NICHT vorgeschlagen, weil es `sidebar.js`s dokumentiertes Prinzip
verletzen würde ("kennt bewusst nur einen Container, keine
Interaktionslogik des aufrufenden Moduls", `vermoegensschichtung.js:36-38`
zitiert dasselbe Prinzip) - die schmale, modul-eigene Funktion ist der
konsistentere Bruch mit dem geringsten Risiko für bestehende Aufrufer.

---

## Pause

Punkt 1 ist abgeschlossen, keine Codeänderung vorgenommen. Diese Sitzung
wartet jetzt auf die Freigabe der Zuordnung (insbesondere: Entscheidung zu
`buergerbuch` ohne bestehende Zielansicht, Entscheidung zu `person`
Option a/b, Bestätigung der übrigen Zielansichten/Eingriffe) und der
Eingriffe, bevor Punkt 2-5 begonnen werden.

---

## 2026-09-23 (28) – Rückfragen zu 2a-K und Umzug ins Repository

**Auftrag (Kurzfassung):** Vier Klärungspunkte vor der Freigabe von 2a-K,
reine Erhebung/Vorschlag, keine Codeänderung. Ab sofort wird ausschließlich
in `C:\Users\ali\Desktop\GitHub\Interface-Krems` (Zweig `main`) gearbeitet,
der bisherige Ordner `GI_2.0` wird nicht mehr verwendet.

### Nachtrag (wichtig, erst gegen Ende der Sitzung bemerkt)

Der unten dokumentierte Befund zu Punkt 1 (uncommitteter Arbeitsstand,
`HEAD` = „Alpha durch Beta ersetzt") war zum Zeitpunkt der Prüfung (Beginn
dieser Sitzung) wörtlich korrekt. **Im Verlauf dieser Sitzung** ist jedoch
- vermutlich durch den Auftraggeber selbst, außerhalb dieser Sitzung - ein
neuer Commit `f7a4799` „führungen" entstanden, der genau die zuvor als
uncommittet gemeldeten Dateien enthält (`git show --stat f7a4799`: 15
Dateien, u. a. `js/fuehrungen/*`, `css/components.css`, `css/layout.css`,
`js/core/app.js`, `data/fuehrungen.csv`) - **und bereits nach `origin/main`
gepusht** (`git log origin/main -1` zeigt ebenfalls `f7a4799`). Die
Commit-Nachricht lautet „führungen", nicht wie im Auftrag erwartet
„Beta-Stand nach Führungen 2a-K (Freigabe ausstehend)". Da dieser Auftrag
ausdrücklich keine Commits/Pushes durch Claude Code vorsieht und keiner
gemacht wurden, muss dieser Commit von anderer Seite erfolgt sein. Bitte
insbesondere prüfen, ob mit diesem Push bereits ein **nicht wie vorgesehen
freigegebener** 2a-K-Stand live auf GitHub Pages steht.

Der `git status`/`git diff --stat` am Ende dieser Sitzung (siehe
Abschluss-Anforderung) zeigt dementsprechend nur noch `docs/PROJEKTLOG.md`
als Änderung - nicht, weil sich am Punkt-1-Befund etwas relativiert hätte,
sondern weil der Zwischenstand durch diesen externen Commit committet
wurde, bevor diese Sitzung endete.

### Punkt 1 – Repository-Prüfung (Befund bei Sitzungsbeginn)

**Abweichung vom erwarteten Zustand** - wörtliche Ausgaben:

```
$ git branch
* main

$ git status
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
	modified:   CHANGELOG.md
	modified:   css/components.css
	modified:   css/layout.css
	modified:   data/literatur.csv
	modified:   data/ratsprotokolle.csv
	modified:   docs/PROJEKTLOG.md
	modified:   docs/SCHEMA.md
	modified:   js/core/app.js

Untracked files:
	data/fuehrungen.csv
	js/fuehrungen/
	js/utils/unsicherheitHinweis.js
	server_starten.bat

$ git log -1
commit 243aae607671b776163e138f4aef83e18ef8c1fb
Author: alexcapellmann-alt <alex.capellmann@gmail.com>
Date:   Tue Sep 22 09:04:12 2026 +0200

    Alpha durch Beta ersetzt
```

Erwartet war ein sauberer Arbeitsstand mit dem Commit „Beta-Stand nach
Führungen 2a-K (Freigabe ausstehend)" als `HEAD`. Tatsächlich ist der letzte
Commit „Alpha durch Beta ersetzt" - der komplette 2a-K-Stand (und, laut
Dateiliste, auch die Etappen davor: Führungen Teil 1/2a, SCHEMA.md-
Aktualisierung, `literatur.csv`/`ratsprotokolle.csv`) liegt hier nur als
**uncommitteter Arbeitsstand** vor, nicht als Commit. `server_starten.bat`
(untracked) verweist zudem noch auf den alten Ordner `GI_2.0` und Port 8000
(`cd /d C:\Users\ali\Desktop\GI_2.0` / `python -m http.server 8000`) - passt
nicht mehr zum neuen Arbeitsort, wurde aber wie angewiesen nicht angefasst.

Weisungsgemäß **nichts nachkopiert oder committet** - nur gemeldet, Abgleich
erfolgt durch den Auftraggeber.

**Stichproben (alle erfüllt, trotz des oben genannten Commit-Stands - die
Dateien selbst sind inhaltlich vollständig vorhanden):**

| Stichprobe | Ergebnis |
|---|---|
| `fuehrungStation.js`: Navigationssäule + `resize()`-Export | ✅ `resize: () => passeGroesseAn(wurzel)` (Zeile 307), `.fuehrung-nav`-Aufbau vorhanden |
| `layout.css`: Grid-Platzierung `.fuehrungen-bereich` | ✅ `grid-column:1/-1; grid-row:1/-1; min-height:0` (Zeile 191ff.) |
| `app.js`: `kontext.aktuellesVizModul = kontext.modul` für Stationsansicht | ✅ Zeile 702 |
| `data/fuehrungen.csv` mit Demo-Führung (4 Stationen) | ✅ vorhanden, 5 Zeilen (Kopf + 4 Stationen) |
| Keine `?v=`-Reste in `index.html`/`import()`-Zeilen | ✅ `grep` auf `index.html`, `app.js`, `js/fuehrungen/*.js` liefert 0 Treffer |

### Punkt 2 – Auswirkung von `aktuellesVizModul`

Vollständige, per `grep -n "aktuellesVizModul" js/**/*.js` belegte Liste
(Treffer ausschließlich in `js/core/app.js` - keine andere Datei liest/
schreibt diese Variable):

| Zeile | Was dort passiert | Vor 2a-K | Jetzt | Unbedenklich? |
|---|---|---|---|---|
| 160 | Typ-Kommentar auf `aktuellerKontext` | - | - | ja (kein Code) |
| 390, 421 | `renderVisualisierungenTab()`s eigener Kontext (Archivalientypen ohne Galerie): init `null`, nach Laden `kontext.aktuellesVizModul = mod` (rohes Modul-Namespace-Objekt aus `import()`) | unverändert | unverändert - eigener `kontext`, von Führungen nie berührt | ja |
| 399 | Unsicherheits-Button-Callback ruft `kontext.aktuellesVizModul?.resize({showUncertainty})` | unverändert | unverändert - selber, Führungen-fremder `kontext` | ja |
| 496, 498–499 | `erzeugeGalerieFlyoutKontext()` (Bestand + Archivalientypen mit Galerie): init `null`, eigenes `destroy()` zerstört `aktuellesVizModul` | unverändert | unverändert - Fabrik wird von Führungen nicht verwendet (Führungen hat einen eigenen, handgebauten `kontext`) | ja |
| 546 | dieselbe Fabrik: Unsicherheits-Button-Callback | unverändert | unverändert | ja |
| 569–570 | `raeumeVizAnsichtAuf()`: zerstört `aktuellesVizModul` beim Verlassen einer Ansicht | unverändert | unverändert - Funktion wird von Führungen nie aufgerufen | ja |
| 600–601 | `wechsleZuAnsicht()`: zerstört das alte `aktuellesVizModul` vor dem Wechsel | unverändert | unverändert - Funktion wird von Führungen nie aufgerufen | ja |
| **603** | `wechsleZuAnsicht()`: `setUnsicherheitModus(false)` bei jedem Ansichtswechsel | unverändert | unverändert - liegt in derselben, für Führungen unerreichbaren Funktion wie die Zeilen davor; Führungen hat ohnehin keinen Unsicherheits-Button/-Modus | **ja** - explizit geprüft, keine Interaktion möglich |
| 612 | `wechsleZuAnsicht()`: `kontext.aktuellesVizModul = mod` (rohes Modul-Namespace-Objekt) | unverändert | unverändert | ja |
| 679 | `aktualisiereFuehrungenAnsicht()`: `kontext.aktuellesVizModul = null` vor jedem Neuaufbau | **existierte nicht** (Feld gab es 2a nicht) | **neu (2a-K)** | ja |
| **702** | `aktualisiereFuehrungenAnsicht()`: `kontext.aktuellesVizModul = kontext.modul` (Stations-**Instanz** aus `fuehrungStation.js`s `render()`, NICHT das rohe Modul-Namespace-Objekt wie bei den anderen Kontexten) | **existierte nicht** | **neu (2a-K)**, Kernstelle dieses Auftrags | ja, s. Anmerkung unten |
| 711 | `renderFuehrungenTab()`: init `aktuellesVizModul: null` | existierte nicht | neu (2a-K) | ja |
| 768 | `verarbeiteResize()`: zentraler, 200ms-debouncter Aufruf `aktuellerKontext.aktuellesVizModul?.resize()` (ohne Argumente) | rief bei Führungen nie etwas auf (`aktuellesVizModul` war dort immer `undefined`/nicht gesetzt) | ruft jetzt bei aktiver Station `fuehrungStation.js`s `resize()` auf | ja - einzige tatsächlich neue Laufzeit-Auswirkung, genau wie in 2a-K beabsichtigt |
| 765–767 | `verarbeiteResize()`: `if (aktuellerKontext.kleinerBildschirmHinweis) {...}` | Führungen-Kontext hat dieses Feld nie gesetzt | unverändert - weiterhin `undefined`, Zweig wird übersprungen | ja |

**Anmerkung zu Zeile 702 (kein Bug, aber Struktur-Hinweis):** Bei
Bestand/Visualisierungen ist `aktuellesVizModul` immer das **rohe
ES-Modul-Namespace-Objekt** aus `import()` (Top-Level-Exporte `render`/
`resize`/`destroy`). Bei Führungen ist es stattdessen die **Instanz**, die
`fuehrungStation.js`s `render()` zurückgibt (Closure-gebundenes
`{destroy, resize}`). Beide Formen erfüllen zufällig genau die beiden
tatsächlich aufgerufenen Methoden (`resize()`, `destroy()`) - an keiner
Stelle wird `aktuellesVizModul.render(...)` aufgerufen oder die Objektform
sonst geprüft, daher aktuell **funktional unbedenklich**. Für künftige
Wartbarkeit dennoch ein **Vorschlag** (nicht umgesetzt): entweder die
Variable in `aktuellerKontext`s Typkommentar (Zeile 160) auf die
tatsächlich gemeinsame, schmale Schnittstelle `{resize(), destroy()}` statt
"Viz-Modul" präzisieren, oder Führungen einen eigenen, schmaleren Hook
(z. B. `kontext.aufResizeHoeren`) geben, den `verarbeiteResize()` zusätzlich
zu `aktuellesVizModul?.resize()` prüft - würde die semantische Überladung
("ist eigentlich kein Viz-Modul") auflösen, ohne Verhalten zu ändern.

### Punkt 3 – Hinweis „größerer Bildschirm nötig" bei der Zeitachse

Beobachtet wurde der Hinweis während der Regressionsprüfung in 2a-K bei
einer **Browser-Pane-Darstellungsbreite von ca. 785 px** (Screenshot-Beweis
damals: 785×455 px) - das liegt unterhalb BEIDER Schwellen aus
`js/utils/bildschirmHinweis.js` (`MINDEST_BREITE = 900`, `MINDEST_HOEHE =
500`), unabhängig von jeder Führungen-Änderung. Kein Zusammenhang mit
`viewportGroesse.js`/`aktuellesVizModul`.

Erneute Prüfung (Server neu aus dem neuen Arbeitsort gestartet, Port 8834,
`window.innerWidth/innerHeight` per JS bestätigt):

| Fenstergröße | Direkt geladen | Nach vorherigem Besuch einer Führungsstation |
|---|---|---|
| 1366×768 | kein Hinweis | kein Hinweis |
| 1440×900 | kein Hinweis | kein Hinweis |
| 1920×1080 | kein Hinweis | kein Hinweis |

Akzeptanzkriterium erfüllt - kein Nachwirken der gemessenen Stationshöhe
oder der `resize()`-Verdrahtung auf die Zeitachse.

### Punkt 4 – Vorschlag: dauerhafte Cache-Lösung ohne Projektdateien

**Vorschlag:** eigener, kleiner Python-Testserver (Standardbibliothek,
keine Abhängigkeit), der auf JEDE Antwort `Cache-Control: no-store,
no-cache, must-revalidate, max-age=0` sowie `Pragma: no-cache` setzt -
liegt **außerhalb des Repositorys** (z. B. im Scratchpad-/Werkzeug-
Verzeichnis der jeweiligen Sitzung), keine Repository-Datei ist dafür
nötig.

**Start:**
```
python nocache_server.py <repo-pfad> <port>
# Beispiel:
python nocache_server.py "C:\Users\ali\Desktop\GitHub\Interface-Krems" 8845
```

**Port:** frei wählbar, in dieser Sitzung mit 8845 getestet (nicht 8834,
um den regulären Vorschau-Server aus `.claude/launch.json` nicht zu
kollidieren).

**Nachweis (in dieser Sitzung tatsächlich getestet, nicht nur behauptet):**
- `curl -D -` auf `/index.html` zeigt den gesetzten Header:
  `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`.
- Externe Probe (Datei außerhalb des Repositorys, über eine zweite Instanz
  desselben Servers ausgeliefert): Datei dreimal in Folge geändert
  (`VERSION-A` → `VERSION-B` → `VERSION-C`), jedes Mal per Browser-
  Navigation **zur exakt selben URL ohne jede Query-String-Änderung**
  abgerufen - jedes Mal wurde sofort der aktuelle Inhalt angezeigt, ohne
  Verzögerung, ohne Neustart des Servers. Genau das war in den drei
  vorherigen Durchgängen (Führungen 2a, Zwischenstände, 2a-K) NICHT der
  Fall - dort blieb dieselbe URL auch nach Dateiänderung teils minutenlang
  auf dem alten Stand, bis eine neue Query-String-Kennung (`?v=k2` o. Ä.)
  verwendet wurde.
- Damit ist das Problem nachweislich ein reines HTTP-Caching-Verhalten
  (fehlende/zu freizügige Cache-Control-Header von `python -m http.server`
  ohne Zusatz, das `.claude/launch.json`s bisherige `gi2-test-server`-
  Konfiguration verwendet), nicht ein Verhalten des Codes selbst.

**Repository-Dateien nötig?** Nein. Das Skript kann vollständig außerhalb
des Repositorys liegen (in dieser Sitzung: Scratchpad-Verzeichnis) und
braucht dafür keine Änderung an `.claude/launch.json` oder irgendeiner
anderen Projektdatei - es ersetzt lediglich den Start-Befehl für den
lokalen Testserver.

**Nicht umgesetzt** (Auftrag wörtlich: nur Vorschlag) - `.claude/
launch.json` wurde nicht geändert, die Testserver dieser Sitzung (Port
8845/8846) wurden nach dem Nachweis wieder gestoppt, die Probe-Datei
gelöscht.

---

## 2026-09-23 (27) – Führungen, Teil 2a-K: Bildschirmfüllendes Layout und Präsentationsnavigation

**Auftrag (Kurzfassung):** Stationen sollen wie eine Präsentation wirken -
eine Station füllt den verfügbaren Bildschirm (kein Seitenscrollen), die
Navigation wird zu einer festen vertikalen Pfeilsäule am rechten Rand
(mobil: feste untere Leiste). Galerie, Datenlogik, Prüfregeln unverändert.

### Punkt 0 - Ist-Zustand (gemessen, vor jeder Änderung)

| Station | Belegtyp(en) | Überschuss 1366×768 | Überschuss 1440×900 | Hauptursache |
|---|---|---|---|---|
| 1 | urkunde | 908 px | 821 px | unskaliertes Urkundenfoto (`sidebar.js`s `.bestand-sidebar-foto-haupt`, keine Höhenbegrenzung) + zusätzlich fehlende Grid-Platzierung von `.fuehrungen-bereich` (wuchs mit dem Inhalt statt die Grid-Fläche zu füllen) |
| 2 | buergerbuch | 0 px | 0 px | passt bereits (keine Bilddarstellung, kurze Felder) |
| 3 | urkunde + inventar (Vergleich) | 571 px | 456 px | wie Station 1, aber nur EIN Belegfoto von zweien betroffen |
| 4 | bestand | 0 px | 0 px | passt bereits |

Gemeinsame Grundursache (nicht pro Station verschieden): `.fuehrungen-bereich`
(Container aus `app.js`s `renderFuehrungenTab()`) hatte keine eigene
Grid-Platzierung in `#app-content` (anders als `.viz-inhalt`/
`.platzhalter-seite`/`.galerie-bereich`) und wuchs deshalb ungebremst mit
seinem Inhalt; `.fuehrung-station-inhalt`/`.fuehrung-beleg` hatten zusätzlich
keinerlei eigene Höhenbegrenzung. Das unskalierte Urkundenfoto war dort, wo
vorhanden, der mit Abstand größte Einzelbeitrag zum Überschuss.

### Punkt 1 - Lösung: Flexbox-Höhenverteilung + gemessene Stationshöhe

Erster Ansatz (reines CSS, wie im Projekt etabliert): `.fuehrungen-bereich`
bekommt `grid-column:1/-1; grid-row:1/-1; min-height:0` (füllt jetzt die
Grid-Fläche von `#app-content`, analog zu den bereits bestehenden
Geschwister-Regeln), darunter eine durchgehende `min-height:0`-Kette über
`.fuehrung-station` → `.fuehrung-station-haupt` → `.fuehrung-station-inhalt`
→ `.fuehrung-beleg` → `.fuehrung-beleg-scroll`/`.fuehrung-erzaehltext`
(`overflow-y:auto` an den beiden letzten Stellen).

Das allein reichte NICHT bis auf 0 px Überschuss: `#app-content` selbst
(body-Flex-Ebene, `css/layout.css`s "VOLLBILD-KORREKTUR") hat laut
dortigem, bereits bestehendem Kommentar BEWUSST kein eigenes
`min-height:0` - andere Tabs sollen bei Bedarf über den Viewport
hinauswachsen dürfen, das durfte dieser Auftrag laut Nicht-Ziel
("Keine Änderung an Layoutregeln, die andere Tabs betreffen") nicht
anfassen. Reines Flex-Shrinking blieb dadurch eine Ebene zu weit oben
hängen (`#app-content` maß bei einem Zwischenstand z. B. 957 px bei nur
768 px Viewporthöhe). Lösung: `.fuehrung-station` bekommt stattdessen eine
EXPLIZITE, gemessene Höhe über das bereits vorhandene
`js/utils/viewportGroesse.js` (nur verwendet, nicht geändert - Nicht-Ziel
eingehalten), reserviert zusätzlich Platz für die tatsächlich gemessene
Fußzeilenhöhe. Das entspricht genau der im Auftrag offen gelassenen
Alternative ("`dvh`-basiert ODER über `viewportGroesse.js`, je nachdem, was
im Projekt üblich ist") - hier war sie nötig, weil die reine CSS-Variante an
einer bewussten, bestehenden Projektentscheidung eine Ebene höher scheiterte.
Verankert per `resize()`-Rückgabe aus `fuehrungStation.js`, in `app.js` an
`kontext.aktuellesVizModul` gehängt (bislang nur für Bestand/Visualisierungen
genutzt) - dieselbe zentrale, 200ms-debouncte Verdrahtung. Unter der
800px-Schwelle (`--fuehrung-umbruch`, dieselbe wie für die Beleg/Text-Spalten
aus Teil 2a) wird KEINE feste Höhe gesetzt - Station scrollt mobil normal
(Soll-Zustand, Auftrag wörtlich).

Ergebnis nach Fix: 0 px Überschuss auf allen vier Stationen bei 1366×768,
1440×900 UND zusätzlich 1920×1080 geprüft. Rückfall bei sehr geringer
Fensterhöhe/200%-Zoom geprüft (683×384 und 1366×300 simuliert): Inhalt wird
NICHT abgeschnitten, `viewportGroesse.js`s eigene `mindestHoehe`-Untergrenze
(320 px) greift, die Seite scrollt dann wie vor diesem Auftrag normal weiter
(WCAG 1.4.4/1.4.10) - kein `overflow:hidden` irgendwo gesetzt.

### Punkt 2 - Vertikale Navigationssäule

Echtes Flex-Geschwister neben Kopf+Inhalt (kein `position:fixed`/`absolute`) -
dadurch automatisch dieselbe Höhe wie die (jetzt fixierte) Station und somit
pixelgleiche Position auf jeder Station, ohne eigenen
Positionierungs-Mechanismus. Pfeile 48×48 px, gefüllte Akzentfarbe,
Fortschrittsanzeige mittig, deaktivierter Zustand über `border` (nicht nur
Deckkraft) für WCAG-1.4.11-Kontrast (≥3:1, manuell nachgerechnet). Letzte
Station: an Stelle des unteren Pfeils ein gleich großer Button
"Zur Übersicht". Mobil wird dieselbe Säule zu einer `position:sticky`-Leiste
am unteren Rand. Pfeiltasten/Bild-auf-ab wechseln die Station, wirken aber
NICHT, solange der Fokus in `.fuehrung-beleg-scroll`/`.fuehrung-erzaehltext`/
dem ⚠-Fenster/einem Eingabefeld liegt (dort weiterhin normales Scrollen).

---

## 2026-09-23 (26) – Latenter Fehler in `baueSidebarInhalt()` (nicht behoben)

**Kontext:** Beim Testen von Führungen-Station 4 (siehe Eintrag 25, „Gefundene
Bugs") stürzte `js/utils/sidebar.js`' `baueSidebarInhalt(record, {
kategorieName, kategorieFarbe, felder })` ab, wenn `kategorieFarbe`
`undefined` bleibt UND `record.bkk_unterkategorie` einen echten Wert trägt:
`baueSidebarBadges()` (Zeile 105) baut dann trotzdem ein Badge (für
`bkk_unterkategorie`, da `[kategorieName, record.bkk_unterkategorie]
.filter(Boolean)` den `kategorieName`-Leerwert herausfiltert, den
`bkk_unterkategorie`-Wert aber behält) und ruft dafür
`passendeTextfarbe(kategorieFarbe)` → `wcagKontrast()` →
`relativeLuminanz()` auf - dort schlägt `.slice()` auf dem `undefined`-Hex-
Wert fehl (`TypeError: Cannot read properties of undefined (reading
'slice')`).

**Auf Wunsch des Auftraggebers NICHT behoben** - hier nur dokumentiert, mit
Angabe, welche bestehenden Aufrufer heute welche Parameter übergeben (Stand
dieser Sitzung, per `grep` auf alle Importe von `baueSidebarInhalt`/
`oeffneSidebar` aus `sidebar.js` ermittelt):

| Aufrufer | Übergibt `kategorieFarbe`? | Betroffen? |
|---|---|---|
| `js/viz/parallelKoordinaten.js:293` (einziger externer Aufrufer von `sidebar.js`s exportiertem `oeffneSidebar()`/`baueSidebarInhalt()`) | Nein - übergibt nur `{ felder: detailFelderFuerAchsen(achsen) }` | **Aktuell NICHT** - `baueDetailRecord()` (Zeile 208) baut einen synthetischen Detail-Datensatz (`name`/`beruf`/`ort`/`jahr`/Achsen-Werte) OHNE `bkk_unterkategorie`-Feld, wodurch `baueSidebarBadges()`s Badge-Liste leer bleibt und `passendeTextfarbe()` gar nicht erst aufgerufen wird. Reine Zufälligkeit der Datensatz-Form, keine bewusste Absicherung im Aufrufer. |
| `js/viz/treemap.js:283` / `js/viz/zeitachse.js:251` | – | Nicht betroffen, aber nur weil beide eine GLEICHNAMIGE, aber eigene LOKALE `oeffneSidebar()`-Funktion haben (nicht aus `sidebar.js` importiert) - rufen den betroffenen Code-Pfad gar nicht auf. |
| Sonst niemand | – | `sidebar.js`' `baueSidebarInhalt()` selbst wird laut `grep` nur an dieser einen Stelle (Zeile 533, innerhalb von `oeffneSidebar()`) aufgerufen. |

**Fazit:** Die Funktion ist heute nur deshalb unauffällig, weil ihr einziger
echter Aufrufer zufällig ein Datensatz-Schema ohne `bkk_unterkategorie`
verwendet - kein bewusster Schutz. Jeder künftige Aufrufer, der einen
echten Bestandsverzeichnis-Datensatz (mit befülltem `bkk_unterkategorie`)
ohne `kategorieFarbe` übergibt, würde denselben Absturz auslösen. Sinnvoller
Fix für einen künftigen, dafür vorgesehenen Auftrag: `kategorieFarbe`
default-Wert (z. B. ein neutraler Farbton) in `baueSidebarBadges()`, oder
das Badge für `bkk_unterkategorie` nur bauen, wenn tatsächlich beide Werte
(`kategorieName` UND `kategorieFarbe`) vorliegen.

---

## 2026-09-23 (25) – Führungen, Teil 2a: Galerie, Stationslayout, Navigation

**Auftrag (Kurzfassung):** Führungen sichtbar/navigierbar machen (Galerie,
Einzel-/Vergleichsstation, Pfeil-/Tastaturnavigation, ⚠-Hinweisfenster).
Belege in 2a nur Anzeige, nicht klickbar - Datensatzaufruf/Vertiefung/
Fortsetzen/Abschluss folgen in 2b/2c.

### Architektur-Entscheidung: eigener Tab-Kontext statt Galerie/Flyout-Muster

`app.js`s bestehendes `erzeugeGalerieFlyoutKontext()`/
`aktualisiereGalerieFlyoutAnsicht()` (für Bestand/`hatGalerie`-Archivalientypen)
ist für "Galerie → eine von MEHREREN Visualisierungen, per Flyout-Tab-Leiste
gewechselt" gebaut. Führungen brauchen "Galerie → GENAU EINE Station,
linear vor/zurück navigiert" - ein strukturell anderes zweites
Navigationsziel, kein Sonderfall des ersten. Deshalb ein eigener, schlanker
`renderFuehrungenTab()`/`aktualisiereFuehrungenAnsicht()`-Kontext in
`app.js` (nach demselben `kontext.destroy()`-Vertrag wie alle anderen Tabs),
der intern zwischen `fuehrungenGalerie.render()` und `fuehrungStation.render()`
umschaltet - keine Kopie/Verbiegung der bestehenden Maschinerie.

### Punkt 1: `history.replaceState()` statt Router-Änderung

Die Anforderung "Stationswechsel per Pfeil aktualisiert den Hash ersetzend"
ließ sich ohne jede Änderung an `router.js` lösen:
`history.replaceState(null, '', baueHash([...]))` ändert die URL, ohne ein
`hashchange`-Ereignis auszulösen (`router.js`s `navigiereZu()` würde das
immer tun, siehe dessen eigener Kommentar "erzeugt automatisch einen
Browser-History-Eintrag") - `fuehrungStation.js` zeichnet sich danach selbst
neu (eigene `geheZu()`/`zeichne()`-Closure). Nur der Ersteinstieg
(Galerie-Kachel-Klick) und "Zurück zur Übersicht" bleiben normale
`navigiereZu()`/`<a href>`-Navigation. Damit war die im Auftrag vorgesehene
Rückmeldepflicht ("falls für ersetzende Hash-Updates... eine Änderung an
router.js nötig ist") gegenstandslos - `router.js` wurde nicht angefasst.

### Punkt 4: `sidebar.js`-Wiederverwendung, wo möglich

`baueUrkundenDetailInhalt()` (für `urkunde`) ist bereits exportiert und
wurde direkt übernommen. `baueSidebarInhalt()` (für `bestand`) wäre
naheliegend gewesen, baut aber IMMER Kategorie-Badges
(`baueSidebarBadges()`) - ohne eine `kategorieFarbe` (die für einen
Führungs-Beleg fachlich keinen Sinn ergibt) stürzt deren
Kontrastfarben-Berechnung (`passendeTextfarbe()` → `wcagKontrast()` →
`relativeLuminanz()`) mit `TypeError: Cannot read properties of undefined
(reading 'slice')` ab - live beim ersten Test von Station 4 gefunden (siehe
"Gefundene Bugs" unten). Für `bestand` (und die drei weiteren Typen ohne
passenden Sidebar-Baustein) daher eigene, aber optisch identische Felder in
`belegDarstellung.js` (dieselben `.bestand-sidebar-feld*`-Klassen). Damit
war auch hier keine `sidebar.js`-Änderung nötig - die im Auftrag vorgesehene
Rückmeldepflicht dafür ebenfalls gegenstandslos.

### Gefundene Bugs (beide selbst behoben, siehe oben/unten)

1. `baueSidebarInhalt()` ohne `kategorieFarbe` stürzt ab (s. o.) - Fix: eigene
   Feldliste statt dieses Bausteins für `bestand`.
2. `istTastaturZielGesperrt()` rief `event.target.closest()` auf - bricht,
   wenn `target` kein Element ist (z. B. `document` selbst bei bestimmten
   synthetisch dispatchten Events). Defensiv abgesichert
   (`typeof target.closest !== 'function'`).

### Prüfregeln (Punkt 2) - Nachweis über temporäre Testkopie

Alle 6 Prüfregeln aus der Auftragstabelle wurden mit einer temporären
Testkopie von `data/fuehrungen.csv` (zwei Zusatz-Führungen `testfaelle`/
`langebeschreibung`) einzeln verifiziert, danach exakt aus einer vorherigen
Sicherung wiederhergestellt (byte-geprüft: BOM/CRLF erhalten, 4
Datenzeilen, ausschließlich `demo`):

1. Beleg-ID nicht gefunden: `urkunde:StaAKr-9999` → „urkunde:StaAKr-9999 - ID
   nicht in data/urkunden.csv gefunden" im Belegbereich.
2. Unbekanntes Präfix: `foo:bar` → „Unbekannter Belegtyp „foo" (Eintrag
   „foo:bar")".
3. `bild` ohne `bild_text`: Bild wird trotzdem angezeigt, zusätzlich
   Fehlerbox „Bild „…" ohne bild_text (Bildunterschrift/Alt-Text)".
4. Führungsangaben in späteren Zeilen abweichend befüllt: Hinweis „Feld
   „fuehrung_titel" ist hier abweichend befüllt - nur die erste Station
   gilt." auf der betroffenen Station.
5. Doppelte/fehlende `station_nr`: „Doppelte station_nr: 3" bzw.
   „Mindestens eine Zeile hat keine station_nr." in der Stations-Kopfzeile.
   Nebenbefund: eine leere `station_nr` sortiert numerisch (`Number('')===0`)
   vor `station_nr=1` und kann dadurch fälschlich zur „ersten Station" für
   die Führungsangaben werden, wenn sie mit echten Stationen gemischt ist -
   in der Praxis unkritisch (die Warnung macht das Problem sofort sichtbar),
   aber für Teil 2b/2c als Bekannte Einschränkung festgehalten.
6. `kurzbeschreibung` > 300 Zeichen: Text wird ungekürzt auf der Kachel
   gezeigt, zusätzlich „Fehler: kurzbeschreibung ist länger als 300
   Zeichen.".

### Offener Punkt (PROJEKTLOG, wie vom Auftraggeber verlangt)

**⚠-Zentralisierung:** `js/utils/unsicherheitHinweis.js` ist eine neue,
eigenständige Utility (Button + verankertes Popup-Fenster) für die
Führungen. Die sieben bestehenden lokalen `WARN_SYMBOL = '⚠'`-Kopien
(`circlePacking.js`, `familienbaum.js`, `ganttDiagramm.js`, `icicle.js`,
`regestenKachelraster.js`, `sunburst.js`, `treemap.js` - dort jeweils ein
reines Text-Icon mit Tooltip, kein Popup-Fenster, andere Interaktion) wurden
NICHT auf diese Utility migriert (Nicht-Ziel dieses Auftrags). Eine
künftige Zusammenführung müsste zuerst klären, ob deren einfacheres
Tooltip-Muster und `unsicherheitHinweis.js`s Popup-mit-Fokus-Management
überhaupt vereinheitlicht werden sollen, oder ob zwei verschiedene
Unsicherheits-UI-Muster (Kurzinfo vs. redaktioneller Zusatztext)
gerechtfertigt bleiben.

### Testumgebung/Caching (Hinweis für künftige Aufträge an diesem Projekt)

Der lokale Testserver (`localhost:8834`, Python `http.server`) läuft hinter
einer aggressiv cachenden Vorschau-Infrastruktur dieser Sitzung: bereits
einmal abgerufene URLs (auch `index.html` selbst) werden auch nach
Dateiänderungen und Server-Neustart teils unverändert weiter ausgeliefert.
Wirksame Abhilfe in dieser Sitzung: Cache-Busting-Query an der
NAVIGATIONS-URL (`index.html?bust=…`) UND an jedem betroffenen
`<script src>`/`<link href>`/dynamischen `import()`-Pfad gleichzeitig (ein
gemeinsamer, bei jeder Dateiänderung neu hochgezählter Query-Wert über die
gesamte Importkette) - alle diese Marker wurden nach Abschluss der
Verifikation wieder vollständig entfernt (grep-geprüft: 0 Treffer in den
ausgelieferten Dateien). Für künftige Aufträge: bei "die App zeigt trotz
Codeänderung noch den alten Stand" zuerst diesen Cache-Verdacht prüfen,
bevor eine vermeintliche Code-Regression gesucht wird.

---

## 2026-09-23 (24) – Führungen, Teil 1: Architektur-Recherche (Punkt 0), Datenbereinigung, Schema

**Auftrag (Kurzfassung):** Datengrundlage für künftige Storytelling-Führungen
schaffen - Punkt 0 reine Recherche (keine Änderungen), Punkt 1 Platzhalter-
Kopfzeilen entfernen, Punkt 2 `literatur_id`-Spalte, Punkt 3 neue
`fuehrungen.csv` mit Demo-Führung, Punkt 4 Schema-Dokumentation. Punkt 0
wurde vor jeder Code-Änderung im Chat zurückgemeldet und vom Auftraggeber
bestätigt ("Befund zu Punkt 0 bestätigt. Bitte Punkt 1–4 wie beauftragt
umsetzen.").

### Punkt 0 - Architektur-Recherche (strukturierter Befund)

**0.1 CSV-Laden/Platzhalterzeile:** `js/core/dataLoader.js:143-144` -
`d3.dsvFormat(';').parse(rohtext)`, `spaltennamen = rohdaten.columns` - liest
IMMER Zeile 1 als Kopfzeile, kein Zeilen-Skip (zusätzlich `js/core/app.js`
nach `slice(1)`/„skip"/„Column1" durchsucht - 0 Treffer). Betroffen waren
`data/literatur.csv` und `data/ratsprotokolle.csv` (beide: Zeile 1
`Column1;Column2;…`, echte Kopfzeile in Zeile 2, danach jeweils 0
Datenzeilen). `data/buergerbuch.csv` hatte dasselbe Problem, bereits in
einer früheren Sitzung behoben (CHANGELOG Eintrag 77). Alle übrigen
`data/*.csv` einzeln geprüft (Zeile 0 vs. 1) - keine weiteren Treffer.
Weder `literatur.csv` noch `ratsprotokolle.csv` sind in
`js/config/archivalienRegistry.js` registriert (grep: 0 Treffer) - der
Literatur-Tab zeigt laut `js/core/app.js:673-674` bislang nur einen
Platzhaltertext, lädt die Datei also noch gar nicht. Die Korruption hatte
damit vor der Korrektur keine sichtbare Auswirkung.

**0.2 Router-Pfadformat:** `js/core/router.js:1-49`, Hash-basiert:
`#<tab>/<segment1>/<segment2>?entity_typ=…&entity_wert=…`. Beispiele (gegen
`archivalienRegistry.js` geprüft): Bestand-Galerie `#bestand`
(`app.js:668`, eigener Tab-Zweig ohne Sub-Pfad), Urkunden-Visualisierung
`#visualisierungen/urkunden/zeitachse` (`archivalienRegistry.js:161`),
Bürgerbuch-Visualisierung `#visualisierungen/buergerbuch/trellis`
(`archivalienRegistry.js:223`). Der Router-Dateikopf nennt selbst bereits
`#fuehrungen/ns-zeit` als Beispiel (`router.js:9`).

**0.3 Datensatz-Aufruf über ID (Stufe 2):** für keinen der fünf Typen
(Urkunde/Bürgerbuch/Verlassenschaftsinventar/Bestand/Person) existiert
heute eine URL-/ID-adressierbare Detailansicht. Alle Sidebars öffnen
ausschließlich über Klick auf ein bereits geladenes Record-Objekt
(`zeigeUrkundenSidebar()`, `js/utils/sidebar.js:469`, nimmt fertige Records
entgegen, keine ID-Lookup-Funktion). Ein früherer Ansatz existiert als
Vorbild, ist aber **bewusst stillgelegt**: `state.js`' `zielSignatur` +
`router.js`' `navigiereZu()` (`js/core/state.js:78-84`, konsumiert von
`js/viz/regestenKachelraster.js:762-800`) ist rein In-Memory (nicht in der
URL gespiegelt) und wird im gesamten Code aktuell **nirgends mehr
aufgerufen** (`setZielSignatur()` grep: einziger Treffer ist die eigene
Definition) - eigener Kommentar dazu in
`js/viz/kalenderHeatmap.js:124-136`: „entfällt ersatzlos … wird von hier
aus schlicht nicht mehr befüllt". Für Bestand (`kuerzel`)/Person
(`personen_id`) gibt es keinen vergleichbaren Mechanismus überhaupt (grep
auf `kuerzel` findet nur interne Sortier-/Lookup-Verwendungen in
`dotPlot.js`, `ganttDiagramm.js`, `bestandsHierarchie.js`, `sidebar.js`).
**Vorbedingung für Teil 2** (auf ausdrücklichen Wunsch des Auftraggebers
hier vermerkt): Teil 2 muss für "Datensatz per ID/URL öffnen" einen NEUEN,
URL-fähigen Mechanismus bauen - der `zielSignatur`-Pfad taugt bestenfalls
als strukturelles Vorbild, ist selbst aber tot und nicht URL-adressierbar.

**0.4 Zustände (Stufe 3):** `state.js:8-29` hält `aktiverTab`,
`aktiveAnsicht`, `unsicherheitModusAktiv`, `filter.entity{typ,wert}`,
`filter.zeitraum`, `filter.suchbegriff`, `datenCache`, `zielSignatur`. Kein
`sessionStorage`/`localStorage` im gesamten Projekt (grep: 0 Treffer) -
reines, flüchtiges Modul-Objekt. In der URL stehen NUR Tab/Ansicht
(`router.js:31-32`) und der Entity-Filter (`entity_typ`/`entity_wert`,
`router.js:33-34,41-46`). Unsicherheiten-Modus resettet bei jedem
Ansichtswechsel (`app.js:603`), Zeitraum-/Suchbegriff-Filter sowie
sämtliche modulinternen Zustände (Zoom/Pan, eingefrorene Hervorhebungen,
Paginierung, lokale Suche - jeweils lokal in den `instanz`-Objekten der
~30 `js/viz/*.js`-Module) haben KEINEN Router-Bezug. Auf Wunsch des
Auftraggebers keine vollständige Modultabelle - das Muster (nur
Tab/Ansicht/Entity-Filter URL-persistent, alles andere flüchtig) gilt
durchgängig und war die eigentlich gesuchte Aussage.

**0.5 Wiederverwendbare Bausteine:** Galerie/Flyout -
`erzeugeGalerieFlyoutKontext()` (`app.js:459`), `hatGalerie`-Flag in der
Registry, aktuell für `urkunden`/`buergerbuch`/`personen` + strukturell
verwandt für `bestand` (`renderBestandTab()`, `app.js:250`).
Unsicherheits-Kennzeichnung - kein zentraler Import, `WARN_SYMBOL = '⚠'`
lokal dupliziert in `circlePacking.js:58`, `familienbaum.js:352`,
`ganttDiagramm.js:71`, `icicle.js:66`, `regestenKachelraster.js:113`,
`sunburst.js:120`, `treemap.js:68`, kombiniert mit
`.bestand-sidebar-unsicher` (`sidebar.js:578`). Lightbox -
`js/utils/lightbox.js`, `oeffneLightbox()`/`schliesseLightbox()` (Zeilen
168/186), fertig wiederverwendbar. Mehrquellen-Laden -
`archivalienRegistry.js`' `datenDatei`-Objekt-Muster (Beispiel Zeile 324),
direkt für eine mehrere Quell-CSVs kombinierende Führungen-Ansicht nutzbar.

### Punkt 1 - Platzhalterzeile entfernen

Keine Umgehung im Code gefunden (0.1) - direkt umgesetzt, wie vom
Auftraggeber nach Bestätigung des Befunds freigegeben. `data/literatur.csv`
und `data/ratsprotokolle.csv`: erste Zeile (`Column1;Column2;…`) per
byte-level Edit entfernt, BOM/CRLF erhalten. Beide Dateien hatten und haben
weiterhin 0 Datenzeilen (nur Kopfzeile) - keine Regression durch fehlende
Testdaten möglich, da nichts davon abhing (0.1).

### Punkt 2 - `literatur_id` in literatur.csv

Neue erste Spalte `literatur_id`, Werte bewusst leer gelassen (Zotero-
Zitierkeys werden vom Auftraggeber selbst nachgetragen, keine Ableitung/
Erfindung). Kopfzeile jetzt exakt
`literatur_id;titel;autor;jahr;kurzbeschreibung;kategorie;link`.

### Punkt 3 - fuehrungen.csv, Demo-Führung

Neue Datei `data/fuehrungen.csv`, 17 Spalten wie vorgegeben, UTF-8 mit BOM,
CRLF, Semikolon-getrennt. Demo-Führung `fuehrung_id = demo`,
`status = entwurf`, vier Stationen. **Verwendete Beleg-IDs** (alle per grep
gegen die jeweilige Quell-CSV verifiziert):

| Station | Beleg | Quelle/Kontext |
|---|---|---|
| 1 | `urkunde:StaAKr-0001` | älteste Urkunde des Bestands, 1108 IX 6, Schenkung an Stift Göttweig |
| 2 | `buergerbuch:BB-0148` | Steffan Pranntner, 1544-10-23 - hat befülltes `unsicherheit_anmerkung`-Feld in der Quelle (mögliche Identität mit einer Urkunden-Person), daher bewusst für die `unsicherheit_hinweis`-Demonstration gewählt |
| 3 | `urkunde:StaAKr-0798` \| `inventar:VI-0002` | Vergleichsslide: Erbschaftssache 1547 (Philipp Schwartzer u. a.) vs. Verlassenschaftsinventar 1671 (Matthias Schmidt, Schmied) - thematisch passendes Paar (beide Erbschaft/Vermögen), keine belegte Identität zwischen den Personen |
| 4 | `bestand:1.1.1.1.1.` | "Ratsprotokolle im Justiz- und Politikfach", `vertiefung = #visualisierungen/urkunden/zeitachse` (Pfadformat aus Punkt 0.2), Text ca. 113 Wörter Platzhalter |

Station 2 nutzt `text` mit vier pipe-getrennten Absätzen, davon drei
aufeinanderfolgende `- `-Aufzählungspunkte. Alle Texte tragen
`[Platzhalter: …]`-Markierung, keine erfundenen Inhalte. `weiterlesen`/
`quellen_intern` bleiben wie vorgegeben leer.

### Punkt 4 - Schema-Dokumentation

`docs/SCHEMA.md`: neuer Abschnitt 10 (`fuehrungen.csv`, alle 17 Spalten,
Zeilenlogik, `beleg`-Präfixtabelle, Unsicherheits-Regel), Abschnitte 2
(`ratsprotokolle.csv`)/9 (`literatur.csv`) um die Platzhalterzeilen-Korrektur
ergänzt, neue Punkte 14/15 in der Zusammenfassung offener Punkte (Root-
Cause-Bestätigung + `fuehrungen.csv`/`zielSignatur`-Vorbedingung für Teil 2).

---

## 2026-09-11 (23) – Familienbaum → Habsburg-Zeitleistenbaum (kompletter Ersatz)

**Auftrag (Kurzfassung):** die vier bisherigen Baumansichten werden durch
EINE zeitleistenbasierte Visualisierung des Hauses Habsburg ersetzt -
Position/Länge jeder Person richtet sich nach ihrer Lebenszeit (echte
Kalenderjahre), nicht nach der Generation. Vorab-Datenarbeit (Personenkreis-
Definition, 17-Zeilen-Herrschaftstabelle) war bereits vom Auftraggeber
geleistet, "1:1 zu übernehmen".

### Punkt 1 - Datenfelder (familien.csv)

Personenkreis live geprüft: Habsburg-Kernfamilien (`familie` in
{habsburg, spanische_habsburger, habsburg_tirol, habsburg_lothringen}) =
exakt 39 Personen (deckt sich mit der aus dem vorletzten Auftrag bekannten
Zahl), plus über `ehepartner_id` verknüpfte, noch nicht enthaltene
Personen = 36 zusätzliche - macht 75 insgesamt. Alle 17 in der
Herrschaftstabelle genannten IDs liegen nachweislich innerhalb dieses
Kreises; die zwei Kaiser AUSSERHALB (karl_iv, sigmund, Familie
"luxemburg") sind korrekt NICHT Teil der 17-Zeilen-Tabelle - der Auftrag
hatte das schon richtig vorgegeben, hier nur gegengeprüft.

**Zwei Bearbeitungsfehler beim Schreiben gefunden und selbst korrigiert,
bevor sie sich auswirkten:**
1. Erster Schreibversuch bestimmte die `id`-Spalte über einen naiven
   `header.indexOf("id")` OHNE die BOM (`﻿`) vorher zu entfernen - der
   Header begann dadurch mit `"﻿id"`, der Index-Abgleich schlug fehl
   (`-1`), es wurde nichts befüllt. Sofort bemerkt (Konsolen-Ausgabe zeigte
   "0 von 17"), korrigiert durch BOM-Entfernung vor dem Spaltenabgleich.
2. Der zweite (korrigierte) Versuch nutzte weiterhin einen NAIVEN
   `zeile.split(";")` ohne Anführungszeichen-Bewusstsein - familien.csv hat
   zahlreiche Zeilen mit eingebetteten Semikolons INNERHALB zitierter
   `titel`/`anmerkung`-Felder (z.B. rudolf_i: `"Graf von Habsburg; ab 1273
   ..."`), wodurch die Spaltenindizes für viele Zeilen verschoben waren -
   Symptom: "WARNUNG bereits befüllt" für 10 der 17 Ziel-IDs (das Skript
   schrieb versehentlich in falsche Spalten). Behoben durch einen
   quote-bewussten Zeilen-Splitter (verfolgt den Anführungszeichen-Zustand,
   trennt nur bei UNQUOTIERTEN Semikolons) - danach exakt 17 befüllt, 2
   Ambiguitäts-Ergänzungen, 0 Fehler. Diese beiden Funde sind eine direkte
   Lehre aus den vorherigen zwei CSV-Aufträgen (dort ausschließlich
   Zeilenenden-/BOM-Probleme, hier zusätzlich das erste Mal ein
   quote-bezogenes Spalten-Verschiebungsproblem) - für künftige
   CSV-Bearbeitungen mit Spalten-Index-Zugriff ab sofort IMMER
   quote-bewusstes Parsen verwenden, nicht mehr naives `split(";")`.

**Verifikation:** 81 Zeilen unverändert, 0 CR (reine LF, wie seit der
CRLF-Bereinigung im vorletzten Auftrag), BOM erhalten, alle 80 Datenzeilen
weiterhin exakt 19 Felder (quote-bewusst geprüft), genau 17 befüllte /
63 leere `herrschaft_von`/`herrschaft_bis`-Zeilen, alle 17 Werte
Zeichen-für-Zeichen identisch mit der Auftragstabelle, beide
`unsicherheit_anmerkung`-Ergänzungen korrekt gesetzt (vorher leer,
Format `herrschaft_von: Titel nennt zwei mögliche Jahre (...) - ...
gewählt.`, exakt dem Auftrags-Template folgend), `rudolf_i`s zitiertes
`titel`-Feld mit eingebettetem Semikolon unangetastet.

### Punkt 2 - Kompletter Ersatz durch den Zeitleistenbaum

Architektur-Entscheidung: der 75-Personen-Kreis wird EINMAL bei `render()`
gefiltert (`data.filter(...)`), alle nachfolgenden Funktionen (byId,
kinderIndex, Familienfarben, Baumaufbau, Steiner-Graph) laufen bereits auf
dieser Teilmenge - vermeidet strukturell den Bug-Typ aus dem vorletzten
Auftrag (Quellenbaum zeigte 71 statt 34 Personen, weil die
Satelliten-Prüfung weiterhin gegen ALLE 80 statt die sichtbare Teilmenge
lief). Die komplette generationsbasierte Y-Berechnung
(`berechneGenerationsEbenen()`/Union-Find/längste-Kette, kompletter
Dateikopf-Abschnitt des vorletzten Auftrags) entfällt ersatzlos - Y kommt
jetzt direkt aus `jahrZuY(geburts-/sterbejahr)`. X-Position weiterhin über
`d3.tree()` (nodeSize jetzt `[BAR_ABSTAND_X, 1]`, da Y separat kommt).

**Ehepaar-Anker/Kinder-Linien:** dieselbe Satelliten-Mechanik wie zuvor,
aber die "Paar-Mitte" (Startpunkt der Kinder-Linien, Y-Position der
Ehe-Verbindungslinie) ist jetzt nicht mehr trivial (beide Partner haben
eine Y-SPANNE, keinen Y-PUNKT mehr) - `ermittleVerbindungsY()` nimmt die
Mitte der zeitlichen Überlappung beider Balken, fällt bei fehlender
Überlappung auf die Mitte des Anker-Balkens zurück. Kinder-Linien enden
am oberen Rand (Geburtsjahr) des Kind-Balkens.

**Teil-Einfärbung** (Kernstück): Basis-Balken in Familienfarbe (ganze
Lebensspanne), bei den 17 Kaisern/Königen ein zweites, schmaleres Overlay-
Rechteck NUR für den Regierungsabschnitt in Gold - einfacher und robuster
als eine 3-Segment-Berechnung (vor/während/nach der Regierungszeit), das
Overlay deckt exakt den relevanten Bereich ab, der Rest bleibt automatisch
sichtbar. Die 19 Personen durch Heirat bekommen den KOMPLETTEN Balken in
einer eigenen, helleren Gold-Variante (`HEIRAT_FARBE`, `#e8cf8a` gegenüber
`GOLD_FARBE` `#c9a227`) statt eines Teilbalkens - bewusst ein eigener,
hellerer Ton, damit "aus eigenem Recht" und "durch Heirat" auch ohne die
zusätzlich beibehaltene Kronen-Symbolik unterscheidbar bleiben.

**Bewusste Vereinfachungen** (im Rahmen des "kompletten Ersatzes",
Auftrag nennt sie nicht, widerspricht ihrer Entfernung aber auch nicht):
Vier-Wege-Modus-Umschalter, Personenauswahl (kein "Wurzelperson"-Konzept
mehr - es gibt nur die eine Gesamtansicht), Quellenbaum-Modus samt
Brücken-Personen-Kennzeichnung, Urkunden-Nennungszahl-Badges - alle vier
setzten auf dem alten 34-Personen-Quellenbaum-Kreis auf, der mit dem
neuen 75-Personen-Habsburg-Kreis konzeptionell nichts mehr zu tun hat, und
wurden im neuen Auftrag an keiner Stelle mehr erwähnt oder verlangt.
Beibehalten, da orthogonal und nicht zur Entfernung vorgesehen: Politische-
Stellung-Umschalter (Alle/Kaiser/Könige samt Steiner-Baum-Näherung, jetzt
auf den 75er- statt 80er-Kreis bezogen), Unsicherheits-Kennzeichnung,
lokales Detail-Popover, Zoom/Pan-Grundmuster, Bildschirm-zu-klein-Fallback,
Info-Button.

**Zoom/Pan:** unverändert das 2D-Transform-Muster aus den vorherigen
Familienbaum-Aufträgen (Mausrad zoomt ohne Zusatztaste, Ziehen verschiebt) -
jenes Muster zitierte bereits DAMALS zeitachse.js als Vorbild und wurde
bewusst 2D statt 1D umgesetzt, weil ein Baum horizontale UND vertikale
Bewegung gleichzeitig braucht; der aktuelle Auftrag verlangt exakt dasselbe
Verhalten, nur mit vertikaler statt horizontaler Zeitachse - keine neue
Herleitung nötig, nur die linke Jahres-Achse wird jetzt bei jedem
Zoom-Schritt aus der aktuellen Transform neu berechnet (`rescaleY()`,
analog zu zeitachse.js' Achsen-Neuaufbau).

### Punkt 3 - Info-Text

Wörtlich wie im Auftrag übernommen, live per `textContent`-Vergleich
bestätigt.

### Live-Testprotokoll

Frischer Port (11111, wie gehabt wegen des bekannten Browser-Cache-
Verhaltens), `.claude/launch.json` danach zurückgesetzt.

- **Personenzahl:** exakt 75 gerenderte `.familienbaum-person`-Knoten.
- **Teil-Einfärbung, 4 Stichproben** (mehr als die geforderten 3, über
  `rect.familienbaum-regierung`/`rect.familienbaum-balken`-Höhenverhältnis
  direkt im DOM gemessen, nicht nur optisch geschätzt):
  - Friedrich III.: 52,6 % (Regierung 1452-1493 = 41 Jahre, Leben
    1415-1493 = 78 Jahre → 41/78 = 52,6 %). **Abweichung vom Auftrag
    festgestellt und hier transparent gemeldet**: der Auftragstext nennt
    "ca. 46 %" als Beispielrechnung - die tatsächliche, aus den echten
    Geburts-/Sterbedaten UND der vorgegebenen Regierungszeit berechnete
    Zahl ist 52,6 %, nicht 46 %. Vermutlich eine grobe Überschlagsrechnung
    im Auftragstext selbst (46 % entspräche eher dem Anteil VOR
    Regierungsbeginn: (1452-1415)/78 = 47,4 %, nahe an "ca. 46 %") - der
    Mechanismus selbst (Overlay-Rechteck exakt im Verhältnis der
    tatsächlichen Jahre) ist korrekt und wurde nicht künstlich an die
    Schätzung angepasst, da die Daten (Geburts-/Sterbejahr, Regierungs-
    beginn/-ende) alle exakt der Vorgabe entsprechen - eine "Korrektur"
    hätte nur die Berechnung selbst verfälscht.
  - Maximilian I.: 18,3 % (Regierung 1508-1519 = 11 Jahre, Leben
    1459-1519 = 60 Jahre → 11/60 = 18,3 %).
  - Joseph II.: 51,0 % (Regierung 1765-1790 = 25 Jahre, Leben 1741-1790 =
    49 Jahre → 25/49 = 51,0 %).
  - Rudolf I.: 24,7 % (Regierung 1273-1291 = 18 Jahre, Leben 1218-1291 =
    73 Jahre → 18/73 = 24,7 %).
  Alle vier DOM-gemessenen Werte stimmen exakt mit der unabhängigen
  Handrechnung überein.
- **Visuell bestätigt** (Screenshots): Gesamtübersicht (75 Personen,
  diagonal absteigende Generationenfolge, Fit-to-View-Startzoom), Ehe-
  Verbindungslinie mit korrektem Mittelpunkt, hohle Krone + vollständige
  helle Gold-Füllung bei einer Kaiserin durch Heirat, Nahaufnahme mit
  deutlich sichtbarem goldenem Teilabschnitt innerhalb eines Lebensbalkens
  (Friedrich III.).
- **Politische-Stellung-Umschalter:** "Kaiser" → 14 Personen bei voller
  Deckkraft (die 14 `kaiser`-Status-Personen INNERHALB des 75er-Kreises -
  korrekt weniger als die bekannten 16 im Gesamtdatensatz, da karl_iv/
  sigmund außerhalb des Habsburg-Kreises liegen), "Könige" → 17 (= alle
  17 Herrschaftstabellen-Personen, exakt).
  Popover: Klick auf Friedrich III. zeigt alle Felder inkl.
  "Herrschaftszeitraum: 1452–1493" korrekt.
- **Konsole:** keine neuen Fehler durch echte Nutzerinteraktion (Klick,
  Mausrad, Ziehen). EIN Fehler trat während der eigenen Testdurchführung
  auf ("Failed to set the 'x' property on 'SVGPoint': non-finite") -
  verursacht durch ein improvisiertes Test-Skript, das eine EIGENE,
  unvollständig konfigurierte `d3.zoom()`-Instanz (ohne `translateExtent`)
  nutzte, um den Zoom-Zustand programmatisch zu setzen - kein Fehler im
  Modul selbst, durch reale Maus-/Tastatur-Interaktion nicht reproduzierbar
  (siehe Konsolen-Check danach: keine weiteren Fehler trotz mehrfacher
  echter Scroll-/Zieh-Gesten).

`familienbaum.js` ist die einzige geänderte JS-Datei, `familien.csv` die
einzige geänderte Datendatei (Nicht-Ziel "keine Datenänderung außerhalb
des Habsburg+Ehepartner-Kreises" eingehalten - nur die 17 Zeilen der
Herrschaftstabelle sowie 2 `unsicherheit_anmerkung`-Ergänzungen berührt).

---

## 2026-09-09 (22) – Familienbaum: Layout-Verbesserung, Quellen-Modus, Kaiserlinie, Farbsystem

**Auftrag (Kurzfassung):** Umfassender Umbau der drei bestehenden
Baumansichten plus ein vierter "Quellenzentrierter Stammbaum"-Modus, ein
Kaiserlinie-Fokusmodus und ein überarbeitetes Farb-/Badge-System - 7
Punkte, Betroffene Dateien ausschließlich `familienbaum.js`. Bei
Unklarheiten (explizit genannt: Habsburg-Untergruppen-Farbwerte) sollte
zurückgemeldet statt eigenmächtig entschieden werden.

### Punkt 0 - Datenprüfung vor dem Entwurf

Eigenes Analyseskript gegen familien.csv/urkunden.csv bestätigte ALLE im
Auftrag genannten Zahlen ohne Abweichung: 43 Personen ohne vater_id/
mutter_id, 10 Personen mit mehr als einem Ehepartner
(rudolf_i/rudolf_iii/albrecht_iii/sigmund/ernst_i/maximilian_i/
ferdinand_ii/ferdinand_iii/leopold_i/joseph_ii), genau 31 familien.csv-IDs
kommen in urkunden.csv's personen_id vor, alle 34 (31+3 Brücken) bilden
schon UNTEREINANDER (per BFS über vater_id/mutter_id/ehepartner_id, ohne
weitere Personen) eine einzige zusammenhängende Komponente - kein
zusätzlicher Zwischenperson-Bedarf über die drei genannten hinaus.
Familie-Verteilung: habsburg=32, spanische_habsburger=3, habsburg_tirol=3,
habsburg_lothringen=1, luxemburg=5, wittelsbach=5, burgund=3, pommern=2,
jagiellonen=2, avis=2, 23 weitere Familien mit je 1 Person (Summe 80).

### Zwei eigenständige Farb-Entscheidungen (Auftrag bat um Rückmeldung)

1. **`habsburg_lothringen`** (1 Person: Franz Stephan von Lothringen,
   Kaiser, Gemahl Maria Theresias) wird als VIERTE Habsburg-Farbvariante
   behandelt statt als generisches Einzelperson-Grau. Begründung: der
   Auftrag öffnet das selbst ("ggf. weitere" Untergruppen), und die
   Grau-Regel soll laut ihrer eigenen Begründung bedeutungslose Einzelfälle
   bündeln - Franz Stephan ist dynastisch die direkte Fortsetzung der
   Hauptlinie, kein bedeutungsloser Einzelfall.
2. **"Andere größere Familien"** wird als Schwellenwert ">= 2 Personen"
   gelesen, nicht als abschließende Zweierliste (Luxemburg/Wittelsbach
   sind im Auftragstext nur Beispiele). Macht Burgund (3), Pommern/
   Jagiellonen/Avis (je 2) zu weiteren eigenen, gedämpften Farben statt
   Grau - derselbe Zweck ("32 Einzelfarben vermeiden") gilt spiegelbildlich
   für "2+ Personen profitieren von einer gemeinsamen Farbe", ein höherer
   Schwellenwert hätte keine Begründung in den Daten.

Beide Entscheidungen sind im Dateikopf-Kommentar von familienbaum.js
ausführlich dokumentiert und hier zurückgemeldet (nicht nur stillschweigend
umgesetzt).

### Punkt 1 - Ehepaar-Ankerknoten

Der aus dem VORHERIGEN Auftrag bereits bestehende Mechanismus (Ehepartner
als Satelliten, Kinder hängen vom Mittelpunkt zwischen Anker und Satellit)
erfüllt "unsichtbarer Verbindungspunkt" bereits strukturell - das war laut
Live-Prüfung NICHT der tatsächliche Schwachpunkt. Die echte Kreuzungs-
ursache bei den 10 Mehrfachehen-Personen: Kinder verschiedener Ehen lagen
in keiner bestimmten Reihenfolge nebeneinander, obwohl die Satelliten
selbst in ehepartner_id-Reihenfolge versetzt werden. Fix:
`vergleicheKinderReihenfolge()` gruppiert Geschwister zuerst nach dem Index
ihres anderen Elternteils in derselben Reihenfolge wie die Satelliten-
Versetzung - dieselbe Funktion erledigt gleich Punkt 2d (Geburtsjahr
innerhalb einer Gruppe).

### Punkt 2 - Generationsregeln

Grundlegend neue Y-Berechnung: `berechneGenerationsEbenen()` läuft EINMAL
über den GESAMTEN Datensatz (nicht pro Modus) - Union-Find verschmilzt
Ehepartner zu einer Ebenen-Gruppe (Regel b), jede Eltern-Kind-Kante wird zu
einer Kante zwischen den Gruppen mit Gewicht +1 (Regel a), die Ebene einer
Gruppe ist die längste eingehende Kette (0 ohne eingehende Kanten). Eine
elternlose Person liegt automatisch in derselben Gruppe wie ihr Ehepartner
und übernimmt dessen Ebene (Regel c) - ergibt sich direkt aus der
Konstruktion, kein Sonderfall-Code nötig. d3.tree() wird weiterhin für die
X-Position verwendet (Kollisionsvermeidung), nicht mehr für Y - die
bisherige "spiegeln"-Sonderbehandlung des Vorfahrenbaums entfällt dadurch
vollständig (dieselbe globale Ebene gilt unverändert für alle vier Modi).
Live verifiziert am Vorfahrenbaum von Albrecht II.: Rudolf I. (älteste
Generation) oben, Albrecht II. unten - korrekt ohne die alte
Spiegel-Logik.

### Punkt 3 - Quellenzentrierter Baum

`baueTeilmengenWurzeln()` verallgemeinert die bisherige
`baueGesamtbaumWurzeln()` auf eine beliebige ID-Teilmenge (Gesamtbaum ruft
sie jetzt mit allen 80 IDs auf, Quellenbaum mit den 34) - eine echte
Vereinfachung/DRY, kein Duplikat. Die 31 Urkundenpersonen werden zur
LAUFZEIT aus urkunden.csv ermittelt (`ladeUrkundenNennungen()`, memoisiert),
nicht hartcodiert - da die Registry diesem Modul nur familien.csv liefert,
lädt es urkunden.csv EIGENSTÄNDIG nach, exakt das bereits etablierte Muster
von karte.js/verbindungskarte.js/bipartiteFlowMap.js (laden ebenfalls
unabhängig orte.csv nach) - hält die Änderung vollständig auf
familienbaum.js beschränkt, ohne app.js/archivalienRegistry.js anzufassen.

**Live-Bug gefunden und behoben:** erster Test zeigte 71 statt 34 sichtbare
Personen im Quellenbaum. Ursache: `baueRenderModell()`s Satelliten-Prüfung
(`byId.has(ehepartnerId)`) bezog sich auf ALLE 80 Personen statt auf die
aktuell sichtbare Teilmenge - Ehepartner außerhalb der 34 (z.B. Blanche von
Frankreich, Viridis Visconti) wurden trotzdem als Satelliten gerendert.
Fix: neuer `sichtbareIds`-Parameter, für Vorfahren/Nachkommen/Gesamt
weiterhin alle 80 (keine Verhaltensänderung), für den Quellenbaum die 34.
Nach dem Fix: exakt 34 eindeutige Personen, ein einziger zusammenhängender
Baum (1 Wurzel, keine getrennten Komponenten), die 3 Brückenpersonen
(Philipp I., Karl II., Elisabeth von Böhmen) korrekt grau/dünnrandig, Klick
auf eine Brückenperson zeigt "Genealogisches Bindeglied (nicht in den
Urkunden genannt)" im Popover.

### Punkt 4 - Kaiserlinie-Fokusmodus

`berechneVerbindungsMenge()`: 2-Approximation Steiner-Baum (Standard-
verfahren, nicht selbst erfunden) - Minimalspannbaum über die paarweisen
kürzesten Distanzen der Zielmenge im vollen Familiengraphen (Eltern+
Ehepartner-Kanten, alle 80 Personen), dann Vereinigung der zugehörigen
tatsächlichen Pfade. Bei 80 Knoten/höchstens 19 Zielpersonen reicht die
Näherung (Millisekunden-Berechnung), das exakte Minimum ist nicht nötig.
"Kaiserin/König durch Heirat" bekommt eine EIGENE, permanente (modus-
unabhängige) Kronen-Kennzeichnung statt in die Zielmenge einzugehen - der
Umschalter hebt ausschließlich kaiser/koenig hervor.

Live verifiziert: "Kaiser" → genau 16 Personen bei voller Deckkraft (1.0),
8 notwendige Verbindungspersonen gedämpft (0,55), 56 stark abgeblendet
(0,18). "Könige" → genau 19 bei voller Deckkraft (kaiser+koenig), 9
gedämpft, 52 abgeblendet. Albrecht V. (koenig) wechselt korrekt von
abgeblendet (bei "Kaiser") zu voll hervorgehoben (bei "Könige") - exakt das
im Akzeptanzkriterium verlangte Verhalten.

### Punkt 5 - Farbsystem & Badges

Drei unabhängige visuelle Kanäle: Füllfarbe = Familie
(`berechneFamilienFarben()`, Habsburg-Basis + 3 Varianten via
`d3.rgb().brighter()/.darker()` - dieselbe Technik wie kategorieFarben.js'
`farbeFuerUnterkategorie()`, hier direkt inline angewendet statt über jene
Funktion selbst, da diese eine d3.hierarchy-Knotenstruktur voraussetzt, die
hier nicht vorliegt), Rand/Symbol = politische Stellung (goldener
Doppelrand + gefüllte/hohle Kronen-Silhouette, als eigenes `<path>`
gezeichnet statt Emoji - Emoji-Glyphen bringen ihre eigene feste Farbe mit
und lassen sich nicht gefüllt/hohl umschalten), Zahlen-Badge = Urkunden-
Nennungszahl (nur bei tatsächlichen Nennungen, modus-unabhängig).
`passendeTextfarbe()` (kategorieFarben.js, unverändert wiederverwendet)
bestimmt die Textfarbe je Knoten aus der tatsächlichen Füllfarbe statt wie
bisher fest Schwarz anzunehmen.

Live verifiziert (Gesamtbaum, "Alle"): 19 gefüllte Kronen (16 kaiser + 3
koenig, exakt), 24 hohle Kronen (19 kaiserin_heirat + 5 koenigin_heirat,
exakt), 31 Nennungs-Badges (exakt die Urkundenpersonen). Habsburg-
Zusammengehörigkeit optisch erkennbar (ein Rotton in 4 Helligkeitsstufen),
andere Familien in sichtbar anderen, gedämpften Tönen.

### Nebenbefund, live gefunden: unvollständige CRLF-Korrektur aus Eintrag (21)

Beim ersten Live-Test zeigten `kronen_voll`/`kronen_hohl`/`goldRinge`
allesamt 0 - trotz korrekter grep-Zählung der hrr_status-Werte in Eintrag
(21). Direkte Prüfung via `fetch('data/familien.csv')` im Browser zeigte:
JEDE der 80 Datenzeilen hat ein fälschlich eingebettetes `\r` direkt vor
dem hrr_status-Wert (`...";` + `\r` + `;koenig`), nicht nur die Kopfzeile,
wie die damalige Prüfung in Eintrag (21) fälschlich annahm. Root Cause:
die damalige zweite Korrektur nutzte eine auf die Kopfzeile zugeschnittene
Regex (`/\r(;hrr_status)$/` - passt nur auf die literale Zeichenkette
"hrr_status", die nur im Spaltennamen der Kopfzeile vorkommt, NIE auf einen
Datenwert wie "koenig") und meldete fälschlich "nur 1 von 81 Zeilen
betroffen", weil sie Datenzeilen mit demselben strukturellen Fehler gar
nicht erkennen konnte. Eine Byte-Zählung (Gesamtzahl `\r` vs. Anzahl `\r`
unmittelbar vor `\n`) deckte auf: 161 `\r` insgesamt, nur 81 davon Teil
einer echten CRLF-Zeilenende-Sequenz, 80 "stray" - exakt eine pro
Datenzeile. Fix: alle `\r`-Zeichen aus der Datei entfernt (`\r\n`→`\n`,
dann verbleibende einzelne `\r` gestrichen) - einheitliche, reine
LF-Zeilenenden. Erneute Vollprüfung: 17 Spalten, 80 gültige Datenzeilen,
grep-Zählung weiterhin exakt 16/3/19/5/37, BOM erhalten. Nach dieser
Korrektur lieferten Kronen/Badges/Doppelrand sofort die korrekten Zahlen
(siehe Punkt 4/5 oben).

### Punkt 6 - Semantischer Zoom

Ein Schwellenwert (`SEMANTISCHER_ZOOM_SCHWELLE = 0,5`), kein dritter
separater Rendering-Zustand - "Nahaufnahme" aus dem Auftrag ist der
bereits bestehende Klick-Popover, keine eigene Textstufe. Unterhalb der
Schwelle: Kurzname (`ermittleKurzname()`, erstes Wort + römische
Ordnungszahl falls direkt danach), Lebensdaten-Zeile ausgeblendet - beide
Varianten werden beim ersten Zeichnen vorberechnet, nur beim tatsächlichen
Über-/Unterschreiten der Schwelle umgeschaltet (nicht bei jedem Zoom-Tick
neu berechnet). Live verifiziert: der initiale Fit-to-View-Maßstab für den
80-Personen-Gesamtbaum liegt deutlich unter 0,5 - Kurzname-Modus greift
sofort beim ersten Laden (Screenshot zeigt kurze Namen), erst nach
Hineinzoomen erscheinen volle Namen + Lebensdaten.

### Punkt 7 - Info-Text

Wörtlich wie im Auftrag übernommen, live per `textContent`-Vergleich exakt
bestätigt.

### Live-Testprotokoll (zusätzlich zu den bereits oben je Punkt genannten Zahlen)

Frischer Port (mehrfach gewechselt: 10505→10606→10707, wegen des bekannten
Browser-Cache-Verhaltens UND weil ein Datenfehler zwischenzeitlich behoben
werden musste), `.claude/launch.json` am Ende wieder auf den
Standardeintrag zurückgesetzt. Getestet: alle vier Modi (Screenshots),
beide Politische-Stellung-Stufen (Screenshots), Gesamtbaum weiterhin 80/80
eindeutige Personen (Regressionscheck des generalisierten
`baueTeilmengenWurzeln()`), Unsicherheiten-Toggle weiterhin funktionsfähig,
keine Konsolenfehler über den gesamten Durchlauf.

---

## 2026-09-09 (21) – Neues Datenfeld `hrr_status` in familien.csv

**Auftrag (Kurzfassung):** Neue Spalte `hrr_status` in `familien.csv`
ergänzen - Werte NICHT recherchieren, sondern die im Auftrag vollständig
vorgegebene, bereits geprüfte Zuordnung (16 kaiser / 3 koenig / 19
kaiserin_heirat / 5 koenigin_heirat / 37 keiner) exakt übernehmen.
Nicht-Ziele: keine Änderung an `familienbaum.js`, keine Herleitung von
`herrschaft_von`/`herrschaft_bis`.

### Umsetzung

Ein Node-Skript (nicht Teil der Codebasis, nur zur Durchführung) las
`data/familien.csv` zeilenweise ein und hängte pro Datenzeile den Status
für die jeweilige `id` an - Nachschlage-Tabelle direkt aus den vier vom
Auftraggeber gelisteten ID-Arrays gebaut, alle nicht gelisteten IDs
erhalten `keiner`. Da jede Zeile der Datei genau einem Datensatz entspricht
(keine eingebetteten Zeilenumbrüche in Anführungszeichen-Feldern, bestätigt
über `wc -l` = 81 = 1 Kopfzeile + 80 Datensätze), reichte reines
zeilenweises Anhängen von `;<status>` ohne vollständiges CSV-Parsing/
Neuschreiben der bestehenden Felder - geringeres Risiko, die bestehende,
teils komplex zitierte Feldstruktur (eingebettete Semikolons/Anführungs-
zeichen in `titel`/`anmerkung`) versehentlich zu verändern.

### Gefundener und selbst behobener Fehler: CRLF-Zeilenenden

`file data/familien.csv` zeigt "with CR, LF line terminators" - die Datei
mischt tatsächlich Zeilenenden: die Kopfzeile endete (vermutlich aus einer
früheren Bearbeitung) auf CRLF, alle 80 Datenzeilen dagegen auf reinem LF
(indirekt bestätigt: der Korrekturlauf fand nur bei GENAU 1 von 81 Zeilen
- der Kopfzeile - ein fehlplatziertes `\r`, siehe Fix unten). Der erste
Schreibversuch splittete den
Dateiinhalt nur nach `"\n"` - beim EINEN Zeilen mit CRLF blieb dadurch das
`\r` am Ende der (gesplitteten) Zeile hängen, direkt VOR dem neu
angehängten `;hrr_status` statt an ihrem eigentlichen Ende. Ergebnis:
`unsicherheit_anmerkung\r;hrr_status` statt `unsicherheit_anmerkung;
hrr_status` - ein syntaktisch zunächst unauffälliger, aber falscher
Spaltenname (`unsicherheit_anmerkung\r`) in der Kopfzeile.

**Wie gefunden:** nicht durch bloßes Sichtprüfen (das `\r` ist in normaler
Textanzeige unsichtbar), sondern durch eine bewusst als letzten Schritt
eingebaute Feld-für-Feld-Konsistenzprüfung (eigener kleiner CSV-Parser,
zählt Felder pro Zeile und listet den Header explizit auf) - der
gedruckte Header-Array enthielt sichtbar `"unsicherheit_anmerkung\r"`
statt `"unsicherheit_anmerkung"`.

**Fix:** zweiter Korrekturlauf, der das fehlplatzierte `\r`
(Regex `/\r(;hrr_status)$/`) auf der betroffenen Zeile entfernt und alle
Zeilen anschließend einheitlich mit `\r\n` (nicht mehr `\n`) wieder
zusammensetzt - stellt die ursprüngliche (wenn auch selbst schon
uneinheitliche) CRLF-Konvention nicht nur wieder her, sondern vereinheitlicht
sie zusätzlich (vorher 1 CRLF + 80 LF, jetzt 81 CRLF durchgängig - eine
Verbesserung gegenüber dem ohnehin bereits inkonsistenten Ausgangszustand,
nicht nur eine Fehlerbehebung).

### Verifikation

- `wc -l data/familien.csv` → 81 (unverändert, keine Zeile verloren/doppelt).
- Byte-Zählung: 81 CRLF-Zeilenenden, 0 reine LF, 0 eingebettete `\r`
  innerhalb einer Zeile (`grep -c $'\r'` auf Zeileninhalt statt Zeilenende
  → 0 Treffer).
- BOM (`﻿`) am Dateianfang unverändert erhalten.
- Eigener Feld-für-Feld-Parser (quote-bewusst, Semikolon-getrennt):
  Header exakt 17 Spalten (`hrr_status` als neue, letzte Spalte, kein
  `\r`-Rest mehr), alle 80 Datenzeilen exakt 17 Felder, kein Ausreißer.
- Stichprobe eines mehrfach zitierten Feldes (rudolf_i, `titel` enthält ein
  eingebettetes Semikolon in Anführungszeichen) korrekt geparst - bestätigt,
  dass das reine Anhängen die bestehende Quotierung nicht beschädigt hat.
- grep-Zählung je Kategorie direkt gegen die finale Datei (unabhängig vom
  Schreib-Skript): `kaiser`=16, `koenig`=3, `kaiserin_heirat`=19,
  `koenigin_heirat`=5, `keiner`=37, Summe=80 - exakte Übereinstimmung mit
  den vorgegebenen Zahlen, keine Abweichung.
- Stichprobe einzelner IDs gegen erwarteten Status: `friedrich_iii`→kaiser,
  `maria_theresia`→kaiserin_heirat, `albrecht_v`→koenig,
  `agnes_von_burgund`→koenigin_heirat, `albrecht_ii`→keiner - alle korrekt.

`docs/SCHEMA.md` (Abschnitt 6, familien.csv) um die neue Spalte ergänzt.
`familienbaum.js` nicht angefasst (Nicht-Ziel eingehalten).

---

## 2026-09-09 (20) – Info-Button für adjazenzmatrix.js/bipartiteFlowMap.js mit korrigierten Texten (Abschluss)

**Auftrag (Kurzfassung):** Direkte Fortsetzung von Eintrag (19). Der
Auftraggeber bestätigte die dort gemeldeten Text/Code-Abweichungen ("Gut
erkannt – beide hätten mit meinem ursprünglichen Text falsche Erwartungen
geweckt") und lieferte korrigierte Texte für `adjazenzmatrix.js` und
`bipartiteFlowMap.js`, 1:1 zu übernehmen, danach ein kurzer Eigen-Check für
alle sechs Module.

### Umsetzung

Beide Module nach demselben in Eintrag (19) etablierten Muster:

- **adjazenzmatrix.js**: `zeichneMatrix()` leert bei jedem Redraw den
  gesamten `container` (wie karte.js) - Info-Button wird deshalb bei jedem
  Redraw zerstört/neu erzeugt, `<style>` bei jedem Redraw neu eingefügt. Der
  bereits bestehende Hinweistext ("Top 40 von N Personen ...") und der
  Info-Button teilen sich jetzt eine neue `.adjazenzmatrix-werkzeugleiste`
  (`display:flex; justify-content:space-between`) statt den Hinweistext als
  eigenständigen Absatz zu belassen - kein zusätzlicher vertikaler Platz
  verbraucht. Kein Leaflet, kein z-index-Sonderfall.
- **bipartiteFlowMap.js**: dieselbe Werkzeugleiste-vor-mapDiv-Struktur wie
  karte.js/verbindungskarte.js, inklusive desselben `position:relative;
  z-index:900`-Fixes (Leaflet-Panes bis 700 würden das Popover sonst
  überdecken, siehe Eintrag (19) für die volle Root-Cause-Herleitung).
  Info-Button-Erzeugung erfolgt bewusst VOR dem `await ladeOrtsVerzeichnis()`
  (synchron, direkt nach dem Leeren/Neuaufbau von `container`) - damit
  `instanz.infoButton` bereits gesetzt ist, falls `destroy()` während des
  await hereinkommt (bestehender Kommentar im Modul: "destroy() kann
  während des await aufgerufen worden sein") und der Button dann korrekt
  mitzerstört wird, statt einen verwaisten document-Listener zu hinterlassen.

### Live-Testprotokoll (Eigen-Check aller sechs Module, ein Durchlauf)

Frischer Port (10404, wie gehabt wegen des bekannten Browser-Cache-
Verhaltens), `.claude/launch.json` danach zurückgesetzt:

- **adjazenzmatrix.js**: Popover zeigt den korrigierten Text
  ("... Ko-Präsenz, nicht automatisch eine persönliche, politische oder
  verwandtschaftliche Beziehung.") (Screenshot).
- **bipartiteFlowMap.js**: Popover zeigt den korrigierten Text ("... links
  die Orte, rechts die Kategorien ..."), sichtbar VOR der Leaflet-Karte
  (Screenshot) - der z-index-Fix greift wie erwartet.
- **karte.js/verbindungskarte.js/wortwolke.js/personenliste.js**: erneut
  per `javascript_tool` geprüft (Button-Klick + `popover.hidden`/
  `textContent` gelesen) - alle vier weiterhin unverändert korrekt, keine
  Regression durch die zwei neuen Module.
- Konsole: über den gesamten Durchlauf (alle 6 Ansichten) keine Fehler.

Damit haben jetzt 16 von 33 `js/viz/`-Modulen einen Info-Button (10 aus
früheren Aufträgen + die 6 aus diesem). Die übrigen 15 (siehe Eintrag (18)
für die vollständige Liste) bleiben laut Nicht-Ziel unangetastet.

---

## 2026-09-09 (19) – Info-Button für 4 der 6 „bleibenden" Module

**Auftrag (Kurzfassung):** Info-Button für 6 der zuvor (Eintrag 18) als
fehlend identifizierten Module ergänzen: `karte.js`, `verbindungskarte.js`,
`adjazenzmatrix.js`, `wortwolke.js`, `personenliste.js`,
`bipartiteFlowMap.js` - Texte vom Auftraggeber vorgegeben, wörtlich zu
übernehmen. Ausdrücklicher Hinweis im Auftrag: bei Abweichung der
tatsächlichen Funktionsweise von der Textbeschreibung (insbesondere
möglich bei `bipartiteFlowMap.js`) vor Umsetzung zurückmelden statt den
Text unpassend zu übernehmen. Nicht-Ziele: keine Änderung an der
Visualisierungslogik der 6 Module, keine Bearbeitung der übrigen 15 Module.

### Vorab-Prüfung der 6 Texte gegen den tatsächlichen Code

Jedes der 6 Module gelesen und der vorgeschlagene Text gegen die
tatsächliche Implementierung geprüft, BEVOR etwas umgesetzt wurde:

- **karte.js**: Marker-Radius nach `anzahl` (Häufigkeit) skaliert
  (`d3.scaleSqrt()`), gestrichelter Rand bei `orte_unsicher`-Treffern -
  Text passt.
- **verbindungskarte.js**: `baueVerbindungen()` zählt Orts-Paare, die in
  derselben Urkunde gemeinsam genannt werden, Linien = Ko-Nennung, keine
  Reise-/Handelsbeziehung behauptet - Text passt.
- **wortwolke.js**: Schriftgröße nach `anzahl` skaliert, Quellenangaben
  (`bereinigeRegestText()`) vor der Auszählung entfernt - der Hinweis auf
  "wiederkehrende Quellenangaben und Formelsprache" bleibt als allgemeine
  Einordnung zutreffend (auch nach Entfernung der Zitate bleibt historisches
  Deutsch mit Formelsprache im Text) - Text passt.
- **personenliste.js**: entspricht exakt der in Eintrag (18) bereits
  fertiggestellten Sortierfunktion - Text passt.
- **adjazenzmatrix.js**: **PASST NICHT.** Der Dateikopf-Kommentar sagt
  explizit "Zelle (i,j) zeigt, wie oft Person i und Person j gemeinsam in
  einer Urkunde genannt werden" - `baueKoNennungsNetzwerk()`/
  `waehleTopPersonenNachGrad()` (aus `urkundenPersonen.js`) bestätigen: die
  Matrix zeigt **Personen** (Top 40 nach Verbindungsgrad), nicht
  Kategorien wie im vorgeschlagenen Text ("zwei Kategorien ... Vermögen und
  Finanzen ... Wirtschaft"). Es gibt in der gesamten Codebasis keine
  Kategorien-Adjazenzmatrix. Zusätzlich: "Klick auf eine Zelle zeigt die
  betroffenen Urkunden" existiert nicht - die Zellen haben nur einen
  Hover-/Fokus-Tooltip (`zeigeTooltip()`, Namen + Anzahl), keinen
  Klick-Handler, keine Liste betroffener Urkunden.
- **bipartiteFlowMap.js**: **PASST NICHT**, wie vom Auftraggeber selbst als
  möglich benannt. Der Dateikopf-Kommentar sagt "Flüsse von geografischen
  Orten ... zu Kategorien" - `baueFluesse()` bestätigt: die zwei Knotenseiten
  sind **Orte** (links, echte Kartenposition) und **Kategorien** (rechts,
  feste Spalte), nicht Urkunden und Orte wie im vorgeschlagenen Text. Ein
  Fluss verbindet einen Ort mit einer Kategorie (`anzahl` = wie viele
  Urkunden diesen Ort UND diese Kategorie gemeinsam tragen), keine Urkunde
  ist selbst ein Knoten.

Für die zwei nicht passenden Module wurde wie im Auftrag verlangt NICHTS
umgesetzt - stattdessen die tatsächliche Struktur im Chat zurückgemeldet,
in Erwartung korrigierter Texte.

### Umsetzung der 4 bestätigten Module

Alle vier nach demselben, bereits etablierten Muster (siehe
`infoButton.js`/`dotPlot.js`): `erzeugeInfoButton()` importiert, Text als
Modul-Konstante (`*_INFO_TEXT`) wörtlich übernommen, Button in einer neuen,
minimalen Werkzeugleiste oben rechts (bzw. bei `personenliste.js` rechts
neben dem bestehenden Suchfeld, da dort bereits eine Werkzeugleisten-Zeile
existiert).

- **karte.js/verbindungskarte.js/wortwolke.js**: diese drei hatten bislang
  KEINE eigene Werkzeugleiste/`<style>`-Injektion - `zeichneKarte()`/
  `zeichneVerbindungskarte()`/`zeichneWortwolke()` leeren bei JEDEM Redraw
  den GESAMTEN `container` (`container.innerHTML = ''`), anders als
  dotPlot.js' Wrapper-Muster. Ein einmalig in `render()` eingefügtes
  `<style>` würde deshalb beim ersten Redraw mitgelöscht - `fuegeStyleEin()`
  wird stattdessen wie bei treemap.js bei JEDEM Redraw neu aufgerufen.
  Ebenso wird der Info-Button bei jedem Redraw zerstört (`instanz.infoButton
  ?.destroy()`) und neu erzeugt (dasselbe Muster wie dotPlot.js/
  ganttDiagramm.js) - ohne das explizite `destroy()` blieben die
  document-Click-/Keydown-Listener aus `infoButton.js` bei jedem Redraw
  zusätzlich registriert.
- **personenliste.js**: `zeichnePersonenliste()` (die Werkzeugleiste
  aufbauende Funktion) wird NUR einmal pro `render()` aufgerufen (Sortieren/
  Suchen ruft nur `zeichneTabelle()` auf, die Werkzeugleiste bleibt
  unangetastet) - hier reicht ein einmaliger Aufbau in `zeichnePersonenliste
  ()`, kein Redraw-Zerstören nötig. Suchfeld und Info-Button jetzt gemeinsam
  in einer neuen `.pl-werkzeugleiste`-Zeile (`display:flex;
  justify-content:space-between`), `destroy()` ruft `instanz.infoButton
  ?.destroy()` auf.

### Nebenbefund, live gefunden und behoben: Popover unsichtbar hinter Leaflet-Karten

Beim ersten Live-Test von `karte.js` blieb das Popover nach Klick auf den
Info-Button unsichtbar - Bildschirmfoto zeigte nichts, obwohl der Button
selbst sichtbar und klickbar war. Root-Cause-Suche über
`javascript_tool` statt erneuter Vermutung: `aria-expanded="true"`,
`popover.hidden === false`, `getBoundingClientRect()` lieferte eine
plausible, vollständig im Viewport liegende Position (x:889-1249,
y:187-410 bei 1280×720) - das Popover WAR korrekt aufgebaut und positioniert,
wurde aber offensichtlich optisch von etwas anderem überdeckt (kein
`overflow:hidden` in der Elternkette gefunden). Ursache: Leaflet setzt für
seine eigenen Layer-Panes (tilePane/overlayPane/shadowPane/markerPane/
tooltipPane/popupPane) intern feste z-index-Werte bis 700 - infoButton.js'
Popover hat nur `z-index:30`, das Kartenmaterial malte sich dadurch
sichtbar darüber. Fix: die jeweilige Werkzeugleiste (`.karte-werkzeugleiste`
/`.verbindungskarte-werkzeugleiste`) bekommt lokal `position:relative;
z-index:900` - etabliert einen eigenen Stapelkontext sicher über Leaflets
Maximum. `infoButton.js` selbst bewusst NICHT angefasst (app-weit geteilt,
außerhalb der Betroffenen Dateien dieses Auftrags; eine globale
Erhöhung hätte ungeprüfte Nebenwirkungen auf andere z-index-Beziehungen,
z.B. `sidebar.js`s z-index:500, gehabt). `wortwolke.js`/`personenliste.js`
zeichnen kein Leaflet, dort trat der Effekt folgerichtig nicht auf und
wurde nicht "vorsorglich" mitgefixt (Abschnitt 12: keine unbegründete
Änderung).

### Live-Testprotokoll

Frischer Port (10303, wie bei den vorherigen Aufträgen wegen des bekannten
Browser-Cache-Verhaltens bei `import()`-Modulen - Port 10202 wurde
zwischenzeitlich für den z-index-Fund benutzt und danach verworfen,
`.claude/launch.json` am Ende wieder auf den Standardeintrag zurückgesetzt):

- karte.js: Popover öffnet, zeigt den exakten Text, sichtbar VOR der
  Leaflet-Karte (Screenshot).
- verbindungskarte.js: Popover öffnet, exakter Text, sichtbar vor der
  statischen Leaflet-Karte (Screenshot).
- wortwolke.js: Popover öffnet, exakter Text (kein Leaflet, kein
  z-index-Problem) (Screenshot).
- personenliste.js: Popover öffnet neben dem Suchfeld, exakter Text, die
  in Eintrag (18) gebaute Sortierung bleibt unverändert funktionsfähig
  (Regressionscheck) (Screenshot).
- Konsole: keine Fehler in allen vier Fällen.

Regressionscheck: `adjazenzmatrix.js`/`bipartiteFlowMap.js` unverändert
(nicht angefasst), die übrigen 15 zuvor identifizierten Module ohne
Info-Button ebenfalls nicht angefasst (Nicht-Ziel eingehalten).

---

## 2026-09-09 (18) – Info-Button-Audit & sortierbare Personenliste (Punkt 2)

**Auftrag (Kurzfassung):** Zwei unabhängige Punkte. Punkt 1: Bestandsaufnahme,
welche `js/viz/`-Module noch keinen Info-Button haben, Liste zurückmelden und
auf Textfreigabe warten, NICHT selbst Texte erfinden. Punkt 2: Spalten der
Personenliste sollen klickbar sortierbar sein (auf-/absteigend), mit
Pfeil-Indikator und pro Spaltentyp passender Vergleichslogik (Text
alphabetisch, Zahlen numerisch, Datumsfelder chronologisch).

Dieser Eintrag deckt nur Punkt 2 ab - Punkt 1 wartet auf Rückmeldung der
Texte durch den Auftraggeber, siehe Selbstauskunft im Chat.

### Punkt 1 – Bestandsaufnahme (nur Liste, keine Umsetzung)

Per grep (`erzeugeInfoButton|info-button|infoButton|ⓘ|Info-Button`, case-
insensitive) gegen alle 33 Dateien in `js/viz/` geprüft. Ergebnis:

- **10 Module haben bereits einen Info-Button** (direkter
  `erzeugeInfoButton()`-Aufruf): familienbaum, dotPlot, zeitachse,
  kalenderHeatmap, ganttDiagramm, circlePacking, icicle, sunburst, treemap,
  regestenKachelraster.
- **2 weitere Module beziehen ihn indirekt** über die gemeinsame Fabrik
  `js/utils/vizPlatzhalter.js` (`baueVizPlatzhalterModul()`), die
  `erzeugeInfoButton()` intern aufruft: `buergerbuchPlatzhalter.js` und
  `verlassenschaftenPlatzhalter.js` - beide übergeben bereits einen fertigen,
  individuellen `infoText` (siehe deren eigener Dateikopf/Konstante
  `INFO_TEXT`). Zählen deshalb NICHT als fehlend, obwohl der erste grep-Lauf
  sie wegen der Kommentar-Erwähnung "Info-Button" zunächst mitfand -
  Gegenprobe durch Lesen beider Dateien bestätigt: funktionierender Button
  mit Text ist bereits vorhanden.
- **21 Module fehlt ein Info-Button vollständig:** korrelationsmatrix,
  wortwolke, karte, verbindungskarte, bipartiteFlowMap, personennetzwerk,
  adjazenzmatrix, chordDiagramm, bipartiterGraph, arcDiagramm, bubbleChart,
  marimekko, alluvial, sankey, horizonChart, ridgeline, streamgraph,
  swimlanes, parallelKoordinaten, trellis (alle 20 unter `urkunden`) sowie
  `personenliste.js` (unter `personen`).

Liste im Chat zurückgemeldet, KEINE Texte selbst formuliert (Auftrag,
wörtlich: "ich schreibe die Erklärtexte ... bitte noch keine Texte selbst
erfinden") - Umsetzung folgt erst nach Freigabe.

### Punkt 2 – Sortierbare Spalten in der Personenliste

**Ist-Zustand-Korrektur:** der Auftrag nahm an, die Tabelle sei "vermutlich
nicht sortierbar" - beim Lesen von `js/viz/personenliste.js` zeigte sich,
dass Sortierung (`aendereSortierung()`, `sortiereRecords()`, Klick-Handler
auf den `<th>`-Elementen inkl. Tastatur-Bedienbarkeit über Enter/Leertaste)
bereits vollständig vorhanden war und funktionierte. Es fehlten nur zwei
Dinge aus dem Soll-Zustand:

1. **Kein visueller Pfeil-Indikator** (▲/▼) für Spalte/Richtung.
2. **Durchgehend derselbe `>`-Vergleich** unabhängig vom Spaltentyp - für
   die drei Zahlenspalten (bereits über `wertFn` als `Number` typisiert)
   war das zufällig korrekt, für Textspalten aber nur UTF-16-Code-Vergleich,
   nicht lokalisierte deutsche Alphabetreihenfolge (Umlaute/ß landen bei
   reinem `>`-Vergleich nicht an der Stelle, die deutsche Sprecher erwarten).

**Umsetzung:**

- Jede `SPALTEN`-Definition trägt jetzt `typ: 'text'` oder `typ: 'zahl'`.
  `erste_nennung`/`letzte_nennung` sind reine Jahreszahlen (keine vollen
  Datumswerte in `personenliste.csv`, siehe `docs/SCHEMA.md`) - als `zahl`
  behandelt, numerischer Vergleich sortiert sie damit zugleich korrekt
  chronologisch, ein eigener `datum`-Typ wäre hier ohne Mehrwert gewesen.
- Neue `vergleicheWerte(wertA, wertB, typ)`: `zahl` → numerische Subtraktion
  (bestehende null/undefined-Sonderbehandlung, leere Werte ans Ende,
  unverändert übernommen), `text` →
  `String(wertA).localeCompare(String(wertB), 'de', {sensitivity: 'base',
  numeric: true})` - `sensitivity: 'base'` ignoriert Groß-/Kleinschreibung,
  `numeric: true` sortiert eingebettete Zahlenfolgen numerisch statt
  zeichenweise (für "Weitere Schreibweisen"-Mehrfachwerte).
- `baueKopfzeile()` bekommt die aktuelle `sortierung` übergeben und setzt den
  Pfeil (▲ = aufsteigend, ▼ = absteigend, `<span class="pl-sortier-pfeil"
  aria-hidden="true">`) sowie `aria-sort` (`ascending`/`descending`/`none`)
  direkt beim Bauen. Da `zeichneTabelle()` die komplette Tabelle inkl.
  Kopfzeile bei JEDEM Sortierwechsel neu aufbaut (bestehendes Verhalten,
  nicht verändert), gibt es hier - anders als bei kalenderHeatmap.js' zuvor
  persistenten Umschalter-Buttons - strukturell keine Möglichkeit für den
  "aktiver Zustand zeigt sich erst nach einem Klick"-Bug: der Kopf wird nie
  mit veraltetem Zustand gerendert, ein nachträglicher
  Indikator-Aktualisierungsaufruf ist schlicht nicht nötig.
- Keine Paginierung vorhanden (ganze Tabelle wird auf einmal gerendert,
  reflowt selbstständig) - der entsprechende Teil des Akzeptanzkriteriums
  entfällt damit, ohne dass etwas fehlt.

**Live-Testprotokoll** (frischer Port 10101 wegen des bekannten
Browser-Cache-Verhaltens bei `import()`-Modulen, `.claude/launch.json`
danach wieder auf den Standardeintrag zurückgesetzt):

- Startzustand: Sortierung nach "Nennungen" absteigend (Default aus
  `render()`, unverändert), Pfeil ▼ korrekt direkt an "Nennungen", 4116 von
  4116 Personen angezeigt.
- Klick auf "Name": aufsteigend alphabetisch korrekt (`(+Cristoff)
  Pirchinger` … `Abraham Behamb` …), Pfeil ▲ wandert zu "Name".
- Erneuter Klick auf "Name": absteigend korrekt (`Zimprecht Baier` …
  `Wolfgangen Paur` …), Pfeil ▼.
- Klick auf "Erste Nennung": numerisch/chronologisch aufsteigend korrekt
  (1108, 1214, 1214, 1230, 1250, 1259, 1277, 1277, 1295, 1295, 1296 …),
  Pfeil ▲ nur an dieser Spalte.
- Rückwechsel auf "Nennungen": zwei Klicks reproduzieren exakt den
  ursprünglichen Startzustand (auf- dann wieder absteigend) - keine
  Zustands-Reste aus den vorherigen Sortierungen.
- Konsole: keine neuen Fehler (die zwei geloggten 404 stammen nachweislich
  aus einer fehlgeschlagenen `launch.json`-Erststellung vor dem eigentlichen
  Test, siehe Netzwerk-Log, nicht aus der Personenliste selbst).

**Nebenbefund (kein Bug, hier notiert):** das erste Schreiben der
temporären `launch.json`-Testserver-Konfiguration per Bash-Heredoc verlor
alle doppelten Backslashes in den Windows-Pfaden (Bash interpretiert `\\`
in einem unquotierten Heredoc als Escape), wodurch ungültige
Pfad-Escapes entstanden und der Testserver das falsche Verzeichnis
auslieferte (404 auf `index.html`). Behoben durch Neuschreiben der Datei
über das Write-Tool (kein Shell-Escaping). Für künftige `launch.json`-
Bearbeitungen: Write-Tool statt Bash-Heredoc verwenden, wenn der Pfad
Backslashes enthält.

Regressionscheck: `js/viz/familienbaum.js` (Registry-Nachbar unter
"Personen") unverändert funktionsfähig, nicht angefasst (Nicht-Ziel
eingehalten - einzige geänderte Datei ist `js/viz/personenliste.js`).

---

## 2026-09-09 (17) – Familienbaum: drei umschaltbare klassische Baumansichten

**Auftrag (Kurzfassung):** Die bisherige Familienbaum-Visualisierung
(Kraft-Layout-Netzwerk, 80 Knoten/117 Kanten, kein klassischer Stammbaum)
wird durch drei per Button umschaltbare klassische Baumdarstellungen
ersetzt: Vorfahrenbaum, Nachkommenbaum, Gesamtbaum. Nicht-Ziele: keine
Änderung an `personenliste.js`/der Registry-Zuordnung, kein Ansicht-
Dropdown für die drei Baumtypen.

### Punkt 0 – Datenprüfung vor dem Entwurf

Eigenes Node-Analyseskript gegen die echten 80 `familien.csv`-Datensätze
gerechnet (RFC4180-Parser, Union-Find für Zusammenhangskomponenten,
rekursive Vorfahren-/Nachkommen-Reichweite) - zwei Prämissen des
Auftragstexts erwiesen sich dabei als NICHT zutreffend:

1. **"Friedrich III." ist NICHT die bestverknüpfte Person.** Direkte
   Verknüpfungen (Eltern+Ehepartner+Kinder): `friedrich_iii` = 4,
   `friedrich_iii_1347` (eine andere, ältere Person gleichen Namens) = 2.
   Top 3: `albrecht_ii`/`leopold_i` (je 7), `leopold_iii`/`ernst_i`/
   `maximilian_i`/`ferdinand_iii` (je 6). Kombinierte Vorfahren+Nachkommen-
   Reichweite (zusätzliches, aussagekräftigeres Kriterium für eine gute
   Startperson, die sowohl als Vorfahren- als auch als Nachkommenbaum-
   Wurzel sinnvoll ist): `albrecht_ii`/`albrecht_i` je 34 erreichbare
   Personen, `albrecht_ii` zusätzlich mit dem höchsten direkten Grad -
   **als `DEFAULT_WURZEL_ID` gewählt** (Punkt 2, Rückmeldung damit
   erledigt).
2. **Die Daten zerfallen NICHT in mehrere unabhängige Familien-Cluster.**
   Union-Find über vater_id/mutter_id/ehepartner_id-Kanten ergibt GENAU
   EINE zusammenhängende Komponente aller 80 Personen. Die 32
   unterschiedlichen `familie`-Werte (Habsburg: 32, 15 weitere mit 1-5
   Mitgliedern) sind reine Namens-/Dynastie-Etiketten - die meisten
   "kleineren Familien" sind exakt die Ehepartner, die in die Habsburg-
   Linie eingeheiratet haben und dadurch bereits über die Ehe-Kante mit
   der Hauptkomponente verbunden sind, keine eigenständigen, unverbundenen
   Cluster. `baueGesamtbaumWurzeln()` ist trotzdem GENERISCH für mehrere,
   tatsächlich unverbundene Cluster geschrieben (nicht auf "genau 1"
   hartcodiert) - zeigt bei den aktuellen Daten korrekt einen einzigen
   zusammenhängenden Baum, würde bei künftigen Datenerweiterungen mit
   echten unverbundenen Familien automatisch mehrere nebeneinanderliegende
   Bäume darstellen.

Weitere Kennzahlen aus derselben Analyse (Grundlage für Layout-
Entscheidungen unten): maximale Vorfahren-Ketten-Tiefe 15 Generationen
(`joseph_ii`), 43 Datensätze ohne erfasste Eltern, 10 Personen mit
mehreren Ehen, 19 Datensätze mit mindestens einem `_unsicher`-Flag.

### Punkt 1 – Drei-Wege-Umschalter

Button-Gruppe `.familienbaum-modus-gruppe` (Vorfahrenbaum/Nachkommenbaum/
Gesamtbaum), exakt analog zu `kalenderHeatmap.js`s "Monat × Tag"/
"Jahrzehnt × Monat"-Umschalter (`aria-pressed` + `.familienbaum-modus-
aktiv`-Klasse). Der dort behobene Bug ("Startzustand erst nach Hin- und
Herklicken korrekt markiert") wurde hier von Anfang an vermieden: dieselbe
`aktualisiereModusButtons()`-Funktion wird UNMITTELBAR nach dem Aufbau
aller Buttons einmalig aufgerufen (nicht erst beim ersten Klick), siehe
Code-Kommentar an der Aufrufstelle. Startansicht: Gesamtbaum (zeigt sofort
alle 80 Personen ohne Personenauswahl-Zwang - unkontroverse, sofort
verständliche Startansicht).

### Punkt 2 – Personenauswahl

Suchschlitz (`<input type="search">`) + `<datalist>` mit allen 80 Namen
(native Browser-Vorschlagsliste, keine eigene Autocomplete-Umsetzung
nötig) - bewusst statt eines 80-Einträge-`<select>`, da der Auftrag
"durchsuchbar" explizit betont. Nur bei Vorfahren-/Nachkommenbaum sichtbar
(`aktualisierePersonenauswahlSichtbarkeit()`). Startwert siehe Punkt 0.
Live verifiziert: Eingabe eines exakten Namens (Datalist-Match) baut den
Baum korrekt für die neue Wurzel neu auf, sowohl für Vorfahren- als auch
Nachkommenbaum getestet (`joseph_ii`: 42 Knoten Vorfahrenbaum-Pedigree,
`rudolf_i`: 75 Knoten Nachkommenbaum bis Joseph II.).

### Punkt 3 – Gesamtbaum

`baueGesamtbaumWurzeln()`: "echte" Wurzeln sind elternlose Personen, die
NICHT bereits als Ehepartner einer bereits verarbeiteten (nach
Nachkommenanzahl absteigend sortierten) Wurzel gelten.

**Beim Live-Test gefundener und behobener Bug (zwei getrennte Fundstellen,
insgesamt 42 doppelt gerenderte Personen im ersten Testlauf):**

1. *Erste Fundstelle (`baueGesamtbaumWurzeln()`):* die ursprüngliche
   Kandidatenliste ("elternlos") reichte nicht - eine elternlose Person,
   deren Ehepartner SELBST erfasste Eltern hat (z. B. Eleonore von
   Portugal, verheiratet mit dem sehr wohl elternhabenden Friedrich III.),
   wurde fälschlich ZUSÄTZLICH zu einem eigenen, zweiten Wurzelbaum (inkl.
   ihrer gemeinsamen Kinder mit Friedrich) statt korrekt nur als sein
   Ehepartner-Satellit behandelt - 42 doppelt gerenderte Personen, live per
   `document.querySelectorAll('.familienbaum-person')`-Auszählung
   entdeckt. **Fix:** Kandidatenliste zusätzlich um jede elternlose Person
   bereinigt, deren Ehepartner selbst erfasste Eltern hat (die wird
   ohnehin über die normale Abstammungs-Rekursion erreicht) - danach noch
   4 verbleibende Duplikate.
2. *Zweite Fundstelle (`baueRenderModell()`):* die "ist diese Person schon
   ein Anker" Prüfung verglich nur gegen das BISHER aufgebaute `knoten`-
   Array - abhängig von der Besuchsreihenfolge über mehrere Wurzelbäume
   hinweg. Beispiel: Katharina von Luxemburg hat selbst erfasste Eltern
   (Karl IV., eigener Anker-Platz in EINEM Wurzelbaum) UND ist mit Rudolf
   IV. verheiratet (Anker-Platz in einem ANDEREN Wurzelbaum) - wurde als
   Satellit gezeichnet, wenn Rudolfs Baum VOR ihrem eigenen verarbeitet
   wurde. **Fix:** zwei Durchläufe - Durchlauf 1 sammelt zuerst die
   VOLLSTÄNDIGE, reihenfolge-unabhängige Menge aller Anker-IDs über alle
   Wurzelbäume hinweg, Durchlauf 2 entscheidet erst danach über Satelliten.
   Live verifiziert nach beiden Fixes: 80 Knoten im DOM, 80 eindeutige
   `aria-label`-Werte, 0 Duplikate.

**Nachtrag für Paare, bei denen BEIDE Seiten einen eigenen Anker-Platz
haben** (z. B. eine Verwandten-Ehe innerhalb derselben Baum-Struktur):
diese bekommen bewusst KEINEN Satelliten (sonst erneute Duplikate), aber
die Eheverbindung soll trotzdem sichtbar bleiben (Punkt 4) - ein
zusätzlicher Nachtrags-Durchlauf NACH der Hauptverarbeitung zeichnet eine
direkte Linie zwischen den beiden bereits final feststehenden Anker-
Positionen.

Layout: gemeinsamer, nicht gerenderter `d3.hierarchy()`-Überbau-Knoten
über allen "echten Wurzeln" (`baueForstLayout()`) - `d3.tree()` weist
dadurch allen Teilbäumen automatisch nicht überlappende X-Bereiche zu,
ohne dass eine Linie zum Überbau selbst gezeichnet wird (Punkt 3, wörtlich:
"nebeneinander ... nicht künstlich verbunden").

### Punkt 4 – Ehepartner-Darstellung

Ehepartner sind bewusst KEINE `d3.hierarchy()`-Kinder, sondern nach der
Layout-Berechnung ergänzte Satelliten (waagrecht neben dem Anker, siehe
`baueRenderModell()`) - dadurch bleibt die Hierarchie ein echter Baum
(Voraussetzung für `d3.tree()`), auch bei mehreren Ehepartnern. "Kinder
hängen mittig unter dem Paar": der Start-Punkt JEDER Eltern-Kind-Linie wird
individuell berechnet - liegt der ANDERE Elternteil dieses konkreten Kindes
als Satellit/Baumgeschwister vor, startet die Linie am Mittelpunkt
zwischen Anker und diesem Elternteil, sonst am Anker selbst. Dadurch hängen
z. B. Leopolds I. Kinder aus drei verschiedenen Ehen jeweils korrekt unter
dem jeweils richtigen Ehepaar-Mittelpunkt, nicht alle unter Leopold selbst.
Die 10 Personen mit mehreren Ehen zeigen alle bekannten Ehepartner
nebeneinander (aufsteigend versetzt, `EHEPARTNER_ABSTAND`) - keine
"1./2. Ehe"-Beschriftung ergänzt (im Auftrag nur als Beispiel-Option
genannt, "nebeneinander" allein bereits eindeutig genug, live geprüft an
Maximilian I. mit 3 Ehefrauen).

Vorfahrenbaum-Sonderfall: die beiden Eltern-Slots eines Ancestors sind
bereits echte Baum-Geschwister (Vater=linkes, Mutter=rechtes Hierarchie-
Kind) - hier wird nur die Eheleitung zwischen ihnen ergänzt, kein
zusätzlicher Satellit (sonst Doppel-Zeichnung). Weitere Ehepartner
desselben Ancestors (nicht Teil dieser spezifischen Abstammungslinie)
erscheinen trotzdem als zusätzliche Satelliten.

### Punkt 5 – Unsicherheits-Kennzeichnung

Unverändert aus der vorherigen Fassung übernommen (`istPersonUnsicher()`,
alle fünf Felder). Live verifiziert: `showUncertainty`-Toggle über die
bestehende App-weite "Unsicherheiten anzeigen"-Schaltfläche
(`js/core/unsicherheitsButton.js` → `resize({showUncertainty})`) schaltet
17 von 75 sichtbaren Knoten (Nachkommenbaum ab Rudolf I.) auf gestrichelten
roten Rand um - Werkzeugleiste/Personenauswahl/Zoom-Position blieben dabei
UNVERÄNDERT erhalten (siehe Punkt 6, `resize()`-Konvention).

### Punkt 6 – Zoom/Pan & responsive Darstellung

`wireZoom()`: dasselbe unveränderte d3-zoom-Standardverhalten wie
`zeitachse.js` (kein `event.filter()`-Override - normales Mausrad zoomt,
Ziehen verschiebt), live per simuliertem Wheel-/Drag-Ereignis bestätigt
(`transform`-Attribut der `<g class="familienbaum-zoom-inhalt">` ändert
sich korrekt bei beiden Gesten). Anders als Zeitachses 1D-Zoom (nur
X-Achse neu skaliert) wird hier das in diesem Projekt noch nicht verwendete
2D-Standardmuster genutzt (`event.transform` direkt als `transform` auf
die Inhalts-`<g>`).

**Start-Zoomstufe nachträglich verbessert** (beim Live-Test entdeckt): ein
fester Startmaßstab 1 ließ bei einem 15 Generationen tiefen Vorfahrenbaum
(Joseph II.) fast nichts vom Baum sichtbar - `wireZoom()` berechnet den
Startzustand jetzt aus der tatsächlichen Baum-Bounding-Box (`Math.min(1,
breite/baumBreite, hoehe/baumHoehe)`), sodass der GANZE Baum beim ersten
Öffnen eingepasst sichtbar ist; kleine Bäume werden dabei NICHT über 100%
vergrößert. `translateExtent` ebenfalls aus derselben Bounding-Box (plus
einer Bildschirmbreite/-höhe Toleranz) - verhindert, dass sich der Baum
komplett aus dem sichtbaren Bereich wegziehen lässt.

`viewportGroesse.js` (`ermittleVerfuegbareBreite()`/`ermittleVerfuegbareHoehe()`)
und `bildschirmHinweis.js` (`istBildschirmZuKlein()`/`baueBildschirmHinweis()`)
unverändert wie in anderen Modulen eingebunden - live verifiziert: Viewport
auf 700×450px verkleinert → Hinweistext ersetzt die gesamte Baumfläche;
zurück auf Normalgröße → Baum erscheint automatisch wieder (über den
bestehenden, debounced `resize()`-Mechanismus aus `app.js`).

`resize()` baut bewusst NUR die Baumfläche neu, nicht die ganze
Werkzeugleiste (Modul-Vertrag: kein grundloses Verwerfen internen
Zustands) - Ausnahme: der Bildschirm-zu-klein-Übergang (in beide
Richtungen) braucht einen vollständigen Neuaufbau, da dort noch keine
Werkzeugleiste existiert bzw. wieder eine gebraucht wird.

### Punkt 7 – Detailanzeige bei Klick (Auftrag verlangte Rückmeldung vor der Umsetzung)

**Entschieden: lokales Detail-Popover, KEINE Wiederverwendung von
`sidebar.js`s `zeigeUrkundenSidebar()`/`zeigeUrkundenDetail()`.**
Begründung: `baueUrkundenDetailInhalt()` (der eigentliche Inhalts-Baustein
hinter beiden Funktionen) baut eine FEST codierte Urkunden-Feldliste
(Signatur/Datum/Regest/Kategorien/Orte/Personen + Fotogalerie/Lightbox) -
keines dieser Felder passt zu einem `familien.csv`-Datensatz (name/titel/
familie/geburtsdatum/sterbedatum, keine Fotos, keine Kategorien im
Urkunden-Sinn). Eine sinnvolle Wiederverwendung bräuchte zuerst genau die
im Auftrag "Sidebar-Lightbox & app-weite Vereinheitlichung" bereits
zurückgestellte Verallgemeinerung (konfigurierbare Feldliste analog zu
`STANDARD_SIDEBAR_FELDER`) UND Anpassungen an den 3 bestehenden Aufrufern
(`kalenderHeatmap.js`/`zeitachse.js`/`dotPlot.js`) - für ein einzelnes,
in sich geschlossenes 4-Felder-Popover unverhältnismäßig. Genau die vom
Auftrag selbst als "pragmatischerer erster Schritt" bezeichnete Option
umgesetzt: `zeigePersonenPopover()`, dasselbe Trigger-öffnet-Panel/Klick-
außerhalb-oder-Escape-schließt-Muster wie `infoButton.js`, hier mit
dynamischem statt festem Inhalt, lokal in `familienbaum.js` gehalten (keine
neue geteilte Datei, da noch kein zweiter Aufrufer existiert). Felder wie
im Auftrag: Name, Titel, Geburtsdatum, Sterbedatum, Familie. Live
verifiziert: Klick öffnet das Popover mit allen fünf Feldern (Titel nur
wenn vorhanden), Escape schließt es wieder, Fokus kehrt zum Auslöser-Knoten
zurück.

### Punkt 8 – Info-Button

Text wortwörtlich aus dem Auftrag übernommen (Akzeptanzkriterium: keine
eigenmächtige Umformulierung) - live per `textContent`-Vergleich Zeichen
für Zeichen bestätigt.

### Grep-Verifikation

```
grep -n "familienbaum" js/config/archivalienRegistry.js
  → Registry-Eintrag unverändert (Nicht-Ziel: keine Änderung an der
    Registry-Zuordnung) - nur in Kommentaren dieses Auftrags referenziert
wc -l js/viz/personenliste.js
  → 169 Zeilen, unverändert (kein Edit/Write-Aufruf auf diese Datei in
    dieser gesamten Sitzung)
grep -n "^export function render\|^export function resize\|^export function destroy" js/viz/familienbaum.js
  → alle drei Modul-Interface-Funktionen vorhanden
grep -n "id: 'vorfahren'\|id: 'nachkommen'\|id: 'gesamt'" js/viz/familienbaum.js
  → alle drei Modi definiert
```

### Regressionscheck

`personenliste.js` (Registry-Nachbar unter `personen`) live unter
`#visualisierungen/personen/personenliste` erneut geöffnet - rendert
unverändert. Keine Konsolenfehler bei keinem der oben beschriebenen
Testschritte.

---

## 2026-09-09 (16) – Kleinauftrag: Familienbaum & Personenliste in die Registry unter „Personen" umgehängt

**Auftrag (Kurzfassung):** `familienbaum.js`/`personenliste.js` sind bereits
vollständige, funktionsfähige Module, aber fälschlich unter `urkunden`
registriert (Fund aus Eintrag (15)). Registry-Umhängung nach `personen`.
Nicht-Ziele: keine Änderung am Code der beiden Module selbst, keine Änderung
an anderen Urkunden-Modulen/deren Registry-Einträgen, keine Änderung an
Bürgerbuch/Verlassenschaften.

### Punkt 1 – Registry-Umhängung

Beide Einträge unverändert (`id`/`label`/`modulPfad` identisch zum vorigen
Stand) aus `urkunden.ansichten` entfernt und in `personen.ansichten`
eingefügt (`js/config/archivalienRegistry.js`). Reihenfolge dort:
`personenliste` zuerst (war auch im alten `urkunden`-Block vor
`familienbaum` gelistet, gleiche relative Reihenfolge beibehalten),
`familienbaum` danach.

**Vor der Umsetzung geprüft, ob "nur Registry-Zuordnung ändern" tatsächlich
ausreicht** (Nicht-Ziel-Grenze ernst genommen, nicht einfach angenommen):
`familienbaum.js`s `render(container, data, options)` behandelt `data`
direkt als flaches Records-Array (`records.filter(...)`, `records.map(...)`
etc., siehe `zeichneFamilienbaum()`); `personenliste.js`s Dateikopf-Kommentar
sagt wörtlich "Erwartete `data`: das flache `records`-Array ... für
personenliste.csv". `personen.datenDatei` lädt aber (aus Auftrag (15), für
den damals einzigen Aufrufer - den inzwischen entfernten Platzhalter) BEIDE
CSVs als EIN gemeinsames Objekt `{familien:[...], personenliste:[...]}`. Ein
reines Verschieben der Registry-Einträge OHNE weitere Anpassung hätte daher
beiden Modulen dieses Objekt statt eines flachen Arrays übergeben - hätte
sie beim ersten `records.filter()`/`.map()`-Aufruf mit einer `TypeError` zum
Absturz gebracht (Objekt hat keine `.filter()`-Methode). Reine Registry-
Umhängung wäre damit NICHT ausreichend gewesen, wie vom Auftrag ursprünglich
angenommen ("Betroffene Dateien: nur archivalienRegistry.js").

**Lösung (kleinstmöglicher Eingriff, der die Nicht-Ziele trotzdem einhält):**
neuer, optionaler Schlüssel `datenSchluessel` auf einzelnen Ansicht-
Einträgen der Registry (`{ id: 'personenliste', ..., datenSchluessel:
'personenliste' }`, `{ id: 'familienbaum', ..., datenSchluessel: 'familien' }`)
+ eine kleine Ergänzung in `js/core/app.js`s `ladeModulUndRender()`:
```js
const datenFuerModul = eintrag.datenSchluessel ? records[eintrag.datenSchluessel] : records;
mod.render(vizContainer, datenFuerModul, {...});
```
Betrifft NUR Ansicht-Einträge, die `datenSchluessel` selbst setzen (aktuell
ausschließlich diese zwei) - jede andere Ansicht app-weit (alle Urkunden-
Module, Bürgerbuch-/Verlassenschaften-Platzhalter, alle 5 Bestand-Module)
hat `eintrag.datenSchluessel === undefined` und bekommt `records`
unverändert durchgereicht wie vor diesem Kleinauftrag - keine Verhaltens-
änderung an einer einzigen bereits bestehenden Ansicht. `familienbaum.js`/
`personenliste.js` selbst: 0 Zeilen geändert (per `git`-lose Sitzung nicht
per Diff, aber per Tool-Aufruf-Protokoll bestätigt: in dieser Sitzung kein
einziger Edit/Write-Aufruf auf diese beiden Dateien).

### Platzhalter-Frage (Auftrag verlangt Rückmeldung: "bitte kurz zurückmelden, wie das technisch sauberer ist")

**Entschieden: Platzhalter-Eintrag für `personen` vollständig entfernt**
(nicht als leerer dritter Unterreiter neben den beiden echten Modulen
belassen). Begründung:
1. Konsistent mit dem in `archivalienRegistry.js`s eigenem Dateikopf-
   Kommentar bereits etablierten Prinzip "Content-driven" (ein
   Archivalientyp erscheint erst, sobald mindestens eine Visualisierung für
   ihn existiert) - dieselbe Logik, konsequent auch auf einzelne Ansichten
   INNERHALB eines bereits bestehenden Archivalientyps angewendet.
2. Ein dauerhaft leerer "Noch keine Visualisierung vorhanden"-Tab NEBEN zwei
   sichtbar funktionierenden Modulen wäre für Nutzer:innen verwirrend
   ("ist das kaputt?"), nicht informativ.
3. `js/utils/vizPlatzhalter.js` (die geteilte Fabrik) bleibt unverändert und
   weiterhin von `buergerbuchPlatzhalter.js`/`verlassenschaftenPlatzhalter.js`
   genutzt - nur die konkrete `personenPlatzhalter.js`-Instanz wird
   überflüssig, da sie nach der Registry-Änderung von KEINEM `modulPfad`
   mehr referenziert wird (`grep -rn "personenPlatzhalter" js/` bestätigt: 0
   Code-Referenzen mehr) - als echten toten Code gelöscht statt als
   unreferenzierte Datei liegen gelassen.
`personen.primaeransicht` entsprechend von `'platzhalter'` auf
`'personenliste'` aktualisiert (die jetzt erste/Standard-Ansicht dieses
Bereichs).

### Live-Verifikation

Frischer Port (9997, wie in Einträgen (10)-(15) etabliert):
- `#visualisierungen/personen/personenliste`: Tabelle rendert, „4116 von
  4116 Personen angezeigt." (Screenshot oben im Verlauf - erster Screenshot-
  Versuch zeigte scheinbar eine leere obere Seitenhälfte; per DOM-Check
  aufgeklärt: KEIN Bug, sondern erwartetes Verhalten von `personenliste.js`
  selbst (unveränderter Code) - die Tabelle ist ~117.000px hoch, da alle
  4116 Zeilen ohne Virtualisierung/Paginierung gerendert werden und die
  Seite dabei zufällig mittig stand; nach `scrollTo(0,0)` zeigt der
  Screenshot Kopfzeile+Werkzeugleiste+Tabellenanfang korrekt).
- `#visualisierungen/personen/familienbaum`: Kraft-Layout rendert, 80
  `.person-knoten`/117 `.familien-kante`-Elemente im DOM (80 = exakt die aus
  Auftrag (15) bekannte Anzahl familien.csv-Zeilen) - Screenshot oben im
  Verlauf.
- Ansicht-Dropdown im Personen-Bereich zeigt exakt "Personenliste"/
  "Familienbaum" (keine Restspur des Platzhalters).
- Urkunden-Dropdown zeigt beide NICHT mehr (24 statt 26 Optionen, per
  `Array.from(select.options)` ausgelesen).
- Alter Direktlink `#visualisierungen/urkunden/familienbaum` fällt sauber
  auf `regestenKachelraster` (Primäransicht) zurück statt einen Fehler zu
  zeigen (`ermittleVisualisierungenAnsichtId()`s bestehende `.some()`-
  Prüfung greift unverändert, keine Anpassung dafür nötig).
- Regressionscheck: Bestand-Tab (Treemap), Bürgerbuch-Platzhalter (2791
  Einträge weiterhin geladen), Kalender-Heatmap - alle unverändert
  funktionsfähig. Keine Konsolenfehler bei keinem der geprüften Wege.

### Punkt 2 – Verbleibende Urkunden-Module

`urkunden.ansichten` zählt jetzt **24** Einträge (`grep -c "id: '"` auf den
`urkunden`-Block, war 26 vor diesem Kleinauftrag). Alle 24 sind bereits
vollständig implementierte, funktionierende Visualisierungen - kein
Stub-/Platzhalter-Modul im gesamten `js/viz/`-Ordner (bereits in Auftrag
(15)s Architektur-Recherche bestätigt: jede `.js`-Datei dort ist eine volle
Implementierung). Diese Zahl beschreibt daher NICHT "wie viele Module noch
gebaut werden müssen", sondern die reine Registry-Größe unter `urkunden` -
eine davon unabhängige Vollständigkeits-/Qualitäts-Zählung (z. B. Vollbild-
Konvention-Konformität) steht separat in `docs/PROJEKTLOG.md`, Eintrag
"Vollbild-Audit aller Module", und wurde hier NICHT neu ausgezählt (beide
Zahlen sollten nicht verwechselt werden).

### Grep-Verifikation

```
sed -n "/typ: .urkunden./,/^  },$/p" js/config/archivalienRegistry.js | grep -n "familienbaum\|personenliste"
  → 0 Treffer (beide korrekt entfernt)
sed -n "/typ: .personen./,/^  }$/p" js/config/archivalienRegistry.js
  → beide Einträge korrekt vorhanden, je mit datenSchluessel
sed -n "/typ: .urkunden./,/^  },$/p" js/config/archivalienRegistry.js | grep -c "id: '"
  → 24
grep -n "datenSchluessel" js/core/app.js js/config/archivalienRegistry.js
  → Definition/Nutzung an den erwarteten Stellen
grep -rn "personenPlatzhalter" js/
  → 0 Code-Referenzen (nur noch der erklärende Kommentar in archivalienRegistry.js)
```

---

## 2026-09-09 (15) – Neue Kacheln „Bürgerbuch", „Verlassenschaften", „Personen" im Visualisierungen-Tab

**Auftrag (Kurzfassung):** Auf der Visualisierungen-Landingpage kommen drei
neue, gleichberechtigte Kacheln neben „Urkunden" dazu (Bürgerbuch,
Verlassenschaften, Personen), jede führt zu einem eigenen Bereich mit
derselben Gerüst-Struktur (Unterreiter-Leiste, Ansicht-Dropdown, Info-Button,
responsive Utilities) - vorerst ohne fertige Visualisierungsinhalte, nur
navigierbares Gerüst. Nicht-Ziele: keine neuen Top-Level-Tabs, keine
Änderung an bestehenden Urkunden-/Bestand-Modulen, keine echten
Visualisierungsinhalte.

### Architektur-Recherche vor der Implementierung

Vor jeder Änderung eine ausführliche Bestandsaufnahme des Routing-/Modul-
Systems durchgeführt (Agent-Recherche über `js/core/router.js`, `app.js`,
`kachelauswahl.js`, `ansichtWechseln.js`, `state.js`, `startseite.js`,
`archivalienRegistry.js`, `dataLoader.js`, `filterleiste.js`, `sidebar.js`,
sowie Prüfung der vier CSV-Header und existierender Tile-Muster) - Ergebnis
war entscheidend für den gesamten weiteren Ansatz:

- Die Architektur ist bereits vollständig registry-getrieben: `js/config/
  archivalienRegistry.js`s `ARCHIVALIENTYPEN`-Array ist die EINZIGE Quelle
  für Kacheln, Unterreiter-Leiste und Ansicht-Dropdown-Inhalt. `kachelauswahl.js`
  rendert `.forEach()` über dieses Array (0 Zeilen Änderung nötig, um weitere
  Kacheln zu bekommen), `app.js`s `renderVisualisierungenTab()` findet den
  passenden Eintrag rein über `route.segmente[0] === archivalientyp.typ`
  (kein hartcodiertes `'urkunden'` irgendwo in `app.js`/`router.js`/
  `ansichtWechseln.js`/`kachelauswahl.js` - per `grep` bestätigt). Der
  Dateikopf-Kommentar von `archivalienRegistry.js` selbst benennt „Bürgerbuch"
  bereits explizit als vorgesehene künftige Ergänzung.
- **Wichtiger, nicht offensichtlicher Fund:** `js/viz/familienbaum.js` und
  `js/viz/personenliste.js` sind bereits VOLLSTÄNDIG IMPLEMENTIERTE, keine
  Platzhalter-Module (237 bzw. 169 Zeilen) - beide aber aktuell unter
  `typ: 'urkunden'` registriert, obwohl ihr jeweiliger Dateikopf-Kommentar
  eindeutig `familien.csv`/`personenliste.csv`-Felder erwartet (z. B.
  `vater_id`, `ehepartner_id`, `schreibweisen`, `anzahl_nennungen` - keines
  davon existiert in `urkunden.csv`). Das sieht nach einem Registrierungs-
  fehler aus, der schon vor diesem Auftrag bestand - vermutlich für genau den
  neuen „Personen"-Bereich vorbereitet, aber nie dorthin verschoben. Dieser
  Auftrag verlangt AUSDRÜCKLICH nur ein leeres Gerüst für „Personen"
  ("Die konkreten Module (Familienbaum, Parallelkoordinaten etc.) folgen in
  separaten, späteren Aufträgen") UND die Datei selbst untersagt Änderungen an
  bestehenden Einträgen ohne Rückfrage ("Pflegeregel") - beide Gründe
  zusammen: `familienbaum`/`personenliste` bleiben exakt dort registriert, wo
  sie waren, unverändert. Nur gemeldet, nicht repariert (Abschnitt 12).
- Kein existierendes „leeres Platzhalter-Modul"-Muster auf Modul-Ebene
  gefunden (jedes `js/viz/*.js` ist eine vollständige Implementierung) -
  `app.js`s `renderPlatzhalterTab()` (für Führungen/Literatur/Über) ist ein
  Platzhalter auf TAB-Ebene, kein Modul mit render/resize/destroy-Vertrag und
  daher nicht direkt wiederverwendbar - als Vorbild für Wortlaut/Ton der
  Platzhaltertexte aber übernommen.
- Alle vier benötigten CSVs (`buergerbuch.csv`, `verlassenschaftsinventare.csv`,
  `familien.csv`, `personenliste.csv`) liegen bereits in `data/` - `dataLoader.js`
  ist vollständig spaltennamen-agnostisch (auch bei Header mit Leerzeichen/
  Klammern wie `"Anteil SchzG an Aktiva (%)"`), keine Anpassung nötig.

### Punkt 1 – Vier Kacheln

Drei neue Objekte an `ARCHIVALIENTYPEN` angehängt (`js/config/
archivalienRegistry.js`), Reihenfolge Urkunden/Bürgerbuch/Verlassenschaften/
Personen wie im Auftrag. Jedes mit `typ`, `label`, `datenDatei`,
`primaeransicht: 'platzhalter'`, `ansichten: [{ id: 'platzhalter', label:
'Noch keine Visualisierung vorhanden', modulPfad: ... }]`. Da
`kachelauswahl.js` direkt über dieses Array iteriert, erscheinen die drei
neuen Kacheln ohne jede Änderung an `kachelauswahl.js` selbst - live
verifiziert: alle vier Kacheln sichtbar, optisch identisch (dieselbe
`.kachelauswahl`-Grid-Regel), alle vier klickbar und führen zur jeweiligen
Unterseite (`#visualisierungen/<typ>/platzhalter`).

### Punkt 2 – Gerüst-Struktur

**Neue geteilte Fabrik `js/utils/vizPlatzhalter.js`** (`baueVizPlatzhalterModul()`):
erfüllt das Modul-Interface (Abschnitt 5) vollständig und baut dabei ECHTE,
bedienbare Bausteine auf (nicht nur importiert/dekorativ):
- **Filterleiste** (`filterleiste.js`): Kategorie-Dimension wird PRO BEREICH
  individuell und DATENGETRIEBEN aus den echten Records ermittelt (Callback
  `ermittleKategorien(data)`) statt hart codiert - Bürgerbuch nutzt die
  CSV-Spalte „Wirtschaftssektor" (16 tatsächlich vorkommende Werte, live
  geprüft), Verlassenschaften „Vermoegensgruppe", Personen bewusst keine
  (Fabrik-Default liefert eine leere Liste → Filterleiste zeigt nur „Alle
  Kategorien", live bestätigt: Dropdown hat exakt eine Option).
- **Info-Button** (`infoButton.js`): echter, funktionierender Popover mit
  bereichsspezifischem Erklärtext (was der Bereich künftig zeigen wird + dass
  aktuell nur das Gerüst existiert) - live geöffnet/geprüft.
- **`viewportGroesse.js`**: `ermittleVerfuegbareHoehe()` bemisst die
  Platzhalterfläche - dieselbe Utility wie die echten Urkunden-Module, keine
  Sonderlösung.
- **`sidebar.js`**: `baueSidebarGeruest()`/`fuegeSidebarStyleEin()` bauen das
  (leere, aria-hidden="true") Sidebar-Gerüst auf - live per DOM-Check
  bestätigt (`.bestand-sidebar` vorhanden, korrekt geschlossen).
- **`bildschirmHinweis.js` BEWUSST NICHT eingebunden** - sein einziger Zweck
  ("für größere Bildschirme optimiert") setzt dichten, raumgreifenden
  Visualisierungsinhalt voraus, den es hier per Auftrag noch nicht gibt; ein
  Aufruf ohne echten Auslösegrund wäre reine Attrappe (Abschnitt 12: keine
  vorgetäuschte Funktionalität). Wird ergänzt, sobald das erste echte Modul
  in einem der drei Bereiche tatsächlich mehr Raum braucht.

Info-Button/Filterleiste/Sidebar werden EINMALIG in `render()` aufgebaut,
NICHT bei jedem `resize()` neu erzeugt (dieselbe bereits etablierte
Konvention wie bei den echten Urkunden-Modulen, z. B. kalenderHeatmap.js'
Info-Button-Kommentar) - live geprüft: nach einem simulierten
`window.dispatchEvent(new Event('resize'))` bleibt genau 1 Info-Button/1
Sidebar im DOM (keine Duplikate, kein `document`-Listener-Leck durch
wiederholtes `erzeugeInfoButton()`).

**Drei schlanke Modul-Dateien** (`js/viz/buergerbuchPlatzhalter.js`,
`verlassenschaftenPlatzhalter.js`, `personenPlatzhalter.js`) rufen die
Fabrik nur mit bereichsspezifischer Konfiguration auf (`export const {
render, resize, destroy } = baueVizPlatzhalterModul({...})`) - je ~30-40
Zeilen, keine Duplikation der eigentlichen Gerüst-Logik.

**Mehrfach-Datenquelle für „Personen":** `archivalienRegistry.js`s
`datenDatei` ist dort ein Objekt (`{ familien: 'data/familien.csv',
personenliste: 'data/personenliste.csv' }`) statt eines einzelnen
Pfad-Strings - `app.js`s bisheriges `ladeGecachteCSV(pfad)` (ein Pfad, eine
Records-Liste) erwartete das nicht. Neue Funktion `ladeArchivalienDaten(datenDatei)`
prüft den Typ: String → unverändertes Verhalten (ein `ladeGecachteCSV()`-
Aufruf, betrifft `urkunden`/`buergerbuch`/`verlassenschaften` NICHT), Objekt
→ lädt jeden Pfad einzeln über denselben `ladeGecachteCSV()`/datenCache-
Mechanismus und liefert ein gleich benanntes Objekt aus Records-Listen
zurück. `personenPlatzhalter.js` liest `data.familien`/`data.personenliste`
entsprechend aus. Live verifiziert: „Personen"-Bereich zeigt „80 Familien-
Einträge und 4116 Personenlisten-Einträge geladen." - beide CSVs tatsächlich
geladen, korrekt getrennt.

### Sidebar-Umbenennung (Auftrag verlangt Rückmeldung)

**Nicht umbenannt.** Geprüft: `zeigeUrkundenSidebar()`/`zeigeUrkundenDetail()`
(`sidebar.js`) rufen intern `baueUrkundenDetailInhalt()` auf, die eine FEST
codierte Urkunden-Feldliste (Signatur/Datum/Regest/Kategorien/Orte/Personen)
aufbaut - eine reine Namensänderung dieser beiden Funktionen würde nichts an
dieser Kopplung ändern, sondern nur fälschlich Allgemeingültigkeit
vortäuschen. Eine ECHTE Verallgemeinerung bräuchte eine konfigurierbare
Feldliste (analog zu `baueSidebarInhalt()`s bereits bestehendem
`STANDARD_SIDEBAR_FELDER`-Parameter-Muster) UND müsste alle drei
bestehenden Aufrufer (`kalenderHeatmap.js`/`zeitachse.js`/`dotPlot.js`)
entsprechend anpassen - eine Änderung dieser Größenordnung ist für einen
Auftrag, der ausdrücklich nur ein leeres Gerüst ohne anklickbare
Einzeldatensätze verlangt, nicht gerechtfertigt (keiner der drei neuen
Platzhalter braucht die Urkunden-Detailansicht aktuell überhaupt). Empfehlung
für einen künftigen Auftrag: sobald das ERSTE echte Modul in einem der drei
neuen Bereiche Einzeldatensätze anklickbar machen soll, dort zuerst
`baueUrkundenDetailInhalt()`/`baueUrkundenListeInhalt()` auf eine
Feldlisten-Konfiguration umstellen (wie bei `baueSidebarInhalt()`) und ERST
DANN umbenennen - sonst müsste dieselbe Umstellung später ohnehin nachgezogen
werden.

### Punkt 3 – Regressionscheck

Live geprüft (frischer Port 9996, siehe Einträge (10)-(14) zur Cache-
Vorsicht): Bestand-Tab (Treemap lädt unverändert, Ansicht-Wechsel zu
Gantt-Diagramm funktioniert), Regesten-Kachelraster (Direktlink
`#visualisierungen/urkunden/regestenKachelraster`, 1069 Treffer), Kalender-
Heatmap (Zellklick → Sidebar-Detailansicht mit Fotogalerie, dieselbe Kette
wie in Auftrag (14) aufgebaut, weiterhin intakt). Keine Konsolenfehler bei
keinem der geprüften Wege.

### Grep-Verifikation

```
grep -n "typ: '" js/config/archivalienRegistry.js
  → 4 Einträge: urkunden, buergerbuch, verlassenschaften, personen
grep -c "modulPfad: '../viz/" js/config/archivalienRegistry.js
  → 34 (5 Bestand + 26 Urkunden [unverändert] + 3 neue Platzhalter)
grep -n "export const { render, resize, destroy }" js/viz/*Platzhalter.js
  → alle drei neuen Module vorhanden
grep -n "^export function zeigeUrkundenSidebar\|^export function zeigeUrkundenDetail" js/utils/sidebar.js
  → unverändert vorhanden (NICHT umbenannt, siehe oben)
grep -n "ladeArchivalienDaten" js/core/app.js
  → Definition + einziger Aufruf in renderVisualisierungenTab()
```

Keine Edit/Write-Aufrufe in dieser gesamten Sitzung auf `js/viz/
regestenKachelraster.js`, `zeitachse.js`, `kalenderHeatmap.js`, `dotPlot.js`,
`treemap.js`, `sunburst.js`, `icicle.js`, `circlePacking.js`,
`ganttDiagramm.js`, `js/utils/sidebar.js`, `js/utils/lightbox.js` oder
`js/core/router.js`/`kachelauswahl.js`/`ansichtWechseln.js` - Nicht-Ziele
("keine Änderung an bestehenden Urkunden-/Bestand-Modulen") damit durch
Unterlassung erfüllt, nicht nur behauptet.

---

## 2026-09-09 (14) – Sidebar-Lightbox & app-weite Vereinheitlichung

**Auftrag (Kurzfassung):** Die neue Sidebar-Detailansicht (Auftrag (13)) soll
die einzige, verbindliche Darstellungsweise für JEDE Urkunden-Sidebar im
Interface werden, unabhängig vom aufrufenden Modul. Zusätzlich soll das
Hauptfoto der Detailansicht anklickbar sein und die bestehende Lightbox
öffnen.

### Punkt 0 – Bestandsaufnahme (vor jeder Änderung durchgeführt)

`grep -rln "baueSidebarGeruest\|baueUrkundenListeInhalt\|baueUrkundenDetailInhalt\|baueSidebarInhalt\|oeffneSidebar" js/` ergab 10 Dateien. Für jede
geprüft, WAS genau sie tut:

| Datei | Nutzt Bestand-Schema (`baueSidebarInhalt()`) | Nutzt Urkunden-Schema | Zustand vor diesem Auftrag |
|---|---|---|---|
| `treemap.js`, `sunburst.js`, `icicle.js`, `circlePacking.js`, `ganttDiagramm.js` | ✅ (5 Module) | - | unverändert, außerhalb des Auftrags (Bestandsverzeichnis, keine Urkunden) |
| `kalenderHeatmap.js` | - | ✅ | nutzte bereits `baueUrkundenListeInhalt()`/`baueUrkundenDetailInhalt()` aus `sidebar.js` (Auftrag (13)) - **bereits korrekt**, keine Content-Migration nötig |
| `zeitachse.js` | - | ✅ | **eigene, lokale** `baueUrkundenSidebarInhalt()`/`oeffneSidebar()` - Datum/Orte/Personen/Kategorien-Badges/Regest/Unsicher-Hinweis, OHNE Fotogalerie. Nur das schema-unabhängige Gerüst (`baueSidebarGeruest()`/`schliesseSidebar()`/`fuegeSidebarStyleEin()`) kam aus `sidebar.js` |
| `dotPlot.js` | - | ✅ | **eigene, lokale** `baueUrkundenSidebarInhalt()`/`oeffneUrkundenSidebar()` - Kategorien-Badges/Datum/Regest/Personen/Orte/Unsicher-Hinweis, OHNE Fotogalerie. Gleiches Gerüst-Wiederverwendungsmuster wie zeitachse.js |
| `regestenKachelraster.js` | - | - | KEINE Sidebar (eigene Inline-Karten-Darstellung, `baueUrkundenListeInhalt()` dort nur in einem Kommentar erwähnt) - Nicht-Ziel, unangetastet |

**Ergebnis:** `zeitachse.js` UND `dotPlot.js` waren "abweichend" im Sinne des
Auftrags (Punkt 0, dritter Spiegelstrich: "Jedes weitere Modul, das Claude
Code ... als abweichend identifiziert") - beide auf die geteilte
Detailansicht migriert (siehe Punkt 2 unten). `regestenKachelraster.js`
wurde geprüft und explizit als NICHT betroffen bestätigt (Nicht-Ziel).

**Bei der Migration entdeckte, nicht offensichtliche Unterschiede zwischen
den beiden Alt-Implementierungen** (wichtig, da sie sonst beim
Zusammenführen stillschweigend verloren gegangen wären):

1. **Unsicher-Hinweis, inkonsistente Kriterien:** `zeitachse.js` prüfte
   `istRecordUnsicher(record)` (datum_unsicher ODER orte_unsicher ODER
   personen_unsicher ODER eine vorhandene Anmerkung), `dotPlot.js` nur
   `record.datum_unsicher` (enger). Die bisher geteilte
   `baueUrkundenDetailInhalt()` (aus Auftrag (13), einziger damaliger
   Aufrufer kalenderHeatmap.js brauchte das nie) hatte GAR KEINEN
   Unsicher-Hinweis. Fix: das umfassendere Kriterium (`istRecordUnsicher()`-
   Logik, bewusste inhaltsgleiche Kopie wie schon in zeitachse.js selbst,
   da die Originalfunktion in regestenKachelraster.js nicht exportiert ist)
   in `baueUrkundenDetailInhalt()` ergänzt - sonst hätten beide Migrationen
   stillschweigend eine bestehende Funktionalität verloren (Abschnitt 12).
2. **Kategorie-Badge-Farbquelle, dotPlot.js:** die Sidebar-Badges nutzten
   `farbeFuerKategorie()` = `instanz.kategorieFarbSkala(...)`, eine PRO
   RENDER dynamisch aus den tatsächlich vorkommenden Kategorienamen
   erzeugte Farbskala (`baueKategorieFarbSkala()`, dieselbe Funktion wie bei
   den 5 Bestand-Modulen mit ihren variablen Hierarchien) - NICHT die feste,
   app-weite `CAT_COLORS`-Palette, die alle ÜBRIGEN Urkunden-Module
   (swimlanes.js, streamgraph.js, kalenderHeatmap.js, zeitachse.js' EIGENE
   Alt-Version, sidebar.js' geteilte Badges) durchgängig verwenden. Nach der
   Migration nutzt dotPlot.js' Sidebar jetzt (wie alle anderen) CAT_COLORS -
   die PUNKTE/ZEILEN in dotPlot.js' eigenem Plot bleiben bewusst UNVERÄNDERT
   bei `kategorieFarbSkala()` (Nicht-Ziel: keine Änderung an der
   Kernvisualisierung). Ein Punkt und sein Sidebar-Badge derselben Kategorie
   können sich daher jetzt in der Farbe unterscheiden - diese Diskrepanz
   bestand VORHER bereits zwischen dotPlot.js und allen anderen
   Urkunden-Modulen (nur unsichtbar, weil dotPlot.js vorher nirgends
   CAT_COLORS zeigte); die Migration macht sie lediglich innerhalb von
   dotPlot.js selbst sichtbar. Explizit gemeldet statt stillschweigend
   übernommen (Abschnitt 12) - eine Vereinheitlichung der PLOT-Farbquelle
   selbst ist ein eigener, hier nicht beauftragter Folgeauftrag (Nicht-Ziel:
   "keine Änderung an der Listen-/Detail-Umschaltlogik selbst", hier weit
   ausgelegt als "keine Änderung an der Kernvisualisierung").
3. **`instanz.ausgewaehltesRecord`-Nachführung (zeitachse.js):** wird an
   einer ZWEITEN Stelle gebraucht (Filterwechsel schließt die Sidebar, falls
   die gerade angezeigte Urkunde aus der sichtbaren Menge fällt, Zeile ~682)
   - kein Teil der generischen sidebar.js-Logik (die kennt "Filter" nicht).
   `oeffneSidebar()` bleibt daher als dünner lokaler Wrapper bestehen, der
   NUR diese Nachführung übernimmt und sonst an `zeigeUrkundenDetail()`
   delegiert.

### Interpretations-Hinweis zum Nicht-Ziel "Keine Änderung an ... Kalender-
### Heatmap (dort bereits korrekt)"

Wörtlich genommen widerspricht dieses Nicht-Ziel Punkt 2s Forderung
("Jede Stelle im Interface ... folgt künftig genau dieser Regel" - explizit
OHNE Ausnahme für Kalender-Heatmap genannt): eine Zelle mit genau einer
Urkunde zeigte vorher IMMER die Liste, nie direkt die Detailansicht. Damit
diese Regel dort greift, MUSSTE die Aufrufstelle in `kalenderHeatmap.js`
von der lokalen `oeffneUrkundenListe()` auf die neue, geteilte
`zeigeUrkundenSidebar()` umgestellt werden - eine reine Ein-Zeilen-
Umstellung des Aufrufs, keine Neugestaltung der Interaktion selbst.
Interpretation: das Nicht-Ziel bezieht sich auf die PLOT-/Achsen-/Legenden-/
Toggle-Logik von Kalender-Heatmap (unverändert) und darauf, dass dort -
anders als bei zeitachse.js/dotPlot.js - KEINE Content-Migration nötig war
(„bereits korrekt" im Sinne von Punkt 0s Bestandsaufnahme), nicht auf ein
Verbot, den nun geänderten sidebar.js-Einstiegspunkt aufzurufen. Explizit
hier dokumentiert, falls diese Lesart nicht der Absicht entspricht.

### Punkt 1 – Lightbox am Hauptfoto

`js/utils/sidebar.js`s `baueFotogalerie()`: das Hauptbild (`<img
class="bestand-sidebar-foto-haupt">`) ist jetzt fokussierbar
(`tabIndex=0`, `role="button"`, `aria-label="...vergrößert anzeigen"`) und
öffnet per Klick/Enter/Leertaste `oeffneLightbox(lightboxBilder,
aktuellerIndex)` - `lightboxBilder` enthält ALLE Fotos dieser Urkunde
(gleiche `{url, alt}`-Struktur wie regestenKachelraster.js' Aufruf),
`aktuellerIndex` wird von den Thumbnail-Klicks mitgeführt (lokale
Closure-Variable), damit die Lightbox beim GERADE angezeigten Foto startet,
nicht immer bei Index 0. Die Lightbox-Komponente selbst
(`js/utils/lightbox.js`) wurde nicht angefasst - reine Wiederverwendung,
Pfeiltasten-/Button-Navigation, Escape und Außerhalb-Klick kommen dadurch
automatisch mit. Die kleinen Thumbnails behalten ihren bisherigen Klick-
Handler unverändert (wechseln nur `hauptbild.src`/`.alt`), bekommen KEINEN
zusätzlichen Lightbox-Trigger (Auftrag, wörtlich).

### Punkt 2 – App-weite Vereinheitlichung

**Neue Einstiegspunkte in `js/utils/sidebar.js`:**
- `zeigeUrkundenDetail(sidebarInstanz, record)` (exportiert): zeigt die
  volle Detailansicht EINER Urkunde. Zeigt den Zurück-Button nur, wenn
  `sidebarInstanz._urkundenListe` tatsächlich gesetzt ist (von einer vorher
  gezeigten Liste) - ein direkter Aufruf ohne Liste (Punktklick in
  zeitachse.js/dotPlot.js) zeigt korrekt KEINEN Zurück-Button.
- `zeigeUrkundenSidebar(sidebarInstanz, titel, records)` (exportiert): der
  einzige Einstiegspunkt, den ein Modul mit einer "Menge Urkunden" (z.B.
  eine Kalender-Zelle) noch braucht - bei `records.length === 1` direkter
  Aufruf von `zeigeUrkundenDetail()` (kein Zwischenschritt über eine
  Ein-Element-Liste), sonst die interne `zeigeUrkundenListe()` (nicht
  exportiert, nur intern/über den Zurück-Button erreichbar).
- `zurueckZurUrkundenListe()` (intern): baut `sidebarInstanz._urkundenListe`
  erneut auf, stellt `_urkundenScrollPosition` wieder her - inhaltlich
  identisch zur vormals in kalenderHeatmap.js lokal gehaltenen Version,
  nur verschoben.

**`baueSidebarGeruest()` verdrahtet den Zurück-Button jetzt SELBST** (baut
das `sidebarInstanz`-Objekt zuerst, hängt dann den Klick-Listener per
Closure daran) - anders als `schliessenBtn`, dessen `fokusZielFallback` pro
Modul unterschiedlich ist und daher weiterhin Aufgabe des Aufrufers bleibt.
**`schliesseSidebar()` setzt zusätzlich `_urkundenListe`/`zurueckBtn.hidden`
zurück** - für die 5 Bestand-Module (nie gesetzt bzw. bereits versteckt)
ein reiner No-Op, für Urkunden-Sidebars sorgt es dafür, dass ein späteres
Öffnen wieder im "Wurzel"-Zustand beginnt, ohne dass der Aufrufer das
selbst nachbauen muss.

**Migration der drei Aufrufer:**
- `kalenderHeatmap.js`: `oeffneUrkundenDetail()`/`oeffneUrkundenListe()`/
  `zurueckZurUrkundenListe()` sowie die `zurueckBtn`-Verdrahtung im
  `render()` vollständig entfernt (jetzt Teil von sidebar.js) -
  `oeffneZellenListe()` ruft nur noch `zeigeUrkundenSidebar(instanz.sidebar,
  titel, records)` auf. Die jetzt tote CSS-Regel `.kal-liste-anzahl`
  entfernt (Gegenstück `.bestand-sidebar-urkunden-anzahl` lebt jetzt in
  sidebar.js).
- `zeitachse.js`: `baueSidebarFeld()`/`baueUrkundenSidebarInhalt()`
  vollständig entfernt, `alsText()` (dadurch ungenutzt) ebenfalls entfernt.
  `oeffneSidebar()` bleibt als dünner Wrapper (siehe Punkt-0-Fund 3 oben).
  `passendeTextfarbe`-Import bleibt (weiterhin für Punktfarben-Kontrast
  gebraucht, siehe `ermittleRandfarbe()`).
- `dotPlot.js`: `baueUrkundenSidebarInhalt()`/`oeffneUrkundenSidebar()`
  vollständig entfernt, `passendeTextfarbe`-Import (dadurch ungenutzt)
  entfernt. `waehlePunkt()` ruft bei neuer Auswahl direkt
  `zeigeUrkundenDetail(instanz.sidebar, record)` auf, der bestehende
  Toggle-Close (erneuter Klick auf denselben Punkt) unverändert.

### Live-Verifikation

Frischer Port (9995, wie in Einträgen (10)-(13) etabliert - `import()`
kann sonst eine veraltete Version servieren) - alle Syntax-Checks
(`node --input-type=module --check`) vorab grün für alle vier geänderten
Dateien.

- **Kalender-Heatmap:** Zelle mit genau 1 Eintrag (`__data__.eintraege.length
  === 1`, per JS gezielt gesucht) öffnet jetzt DIREKT die Detailansicht
  (Titel = Signatur, kein Listen-Element im DOM, Zurück-Button korrekt
  versteckt). Zelle mit 3 Einträgen zeigt weiterhin die Liste; Klick auf
  einen Eintrag → Detail (Zurück-Button erscheint) → "Zurück" → dieselbe
  Liste erneut (Titel/Anzahl identisch).
- **Lightbox (alle drei Module getestet):** Hauptbild-Klick öffnet die
  Lightbox mit korrektem Zähler ("1/2" bzw. "1/4"), "Nächstes Foto"-Button
  navigiert korrekt weiter, Escape schließt NUR die Lightbox
  (`sidebar.classList.contains('offen')` bleibt `true`, per JS-Zustand
  bestätigt statt nur Screenshot). Thumbnail-Klick wechselt das Hauptbild
  OHNE die Lightbox zu öffnen (`lightbox.classList.contains('offen') ===
  false` nach Klick); ein anschließender Hauptbild-Klick öffnet die
  Lightbox danach korrekt beim ZWEITEN Foto ("2/2"), nicht immer beim
  ersten.
- **Zeitachse:** Punktklick auf eine Urkunde mit `foto_ordner` zeigt jetzt
  die Fotogalerie (vorher: keine) - Screenshot oben im Verlauf, plus
  Lightbox-Öffnung von dort aus verifiziert (4 Fotos, Navigation
  funktioniert).
- **Dot Plot:** Punktklick zeigt ebenfalls die Fotogalerie (Screenshot oben
  im Verlauf); erneuter Klick auf denselben Punkt schließt die Sidebar
  weiterhin korrekt (Toggle-Verhalten unverändert, `ausgewaehlt`-CSS-Klasse
  korrekt entfernt).
- **Fünf Bestand-Module (Treemap stichprobenartig geprüft):** Sidebar öffnet
  unverändert, `zurueckBtn` im DOM vorhanden aber `getComputedStyle(...)
  .display === 'none'`, kein Zurück-Button sichtbar, keine
  Layout-Verschiebung gegenüber vorher.
- Keine Konsolenfehler bei keinem der getesteten Wege.

### Grep-Verifikation

```
grep -rn "^function baueUrkundenSidebarInhalt\|^function oeffneUrkundenSidebar" js/
  → 0 Treffer (beide Alt-Implementierungen vollständig entfernt)
grep -n "^export function zeigeUrkundenSidebar\|^export function zeigeUrkundenDetail" js/utils/sidebar.js
  → beide neuen Einstiegspunkte vorhanden
grep -n "zeigeUrkundenSidebar(\|zeigeUrkundenDetail(" js/viz/kalenderHeatmap.js js/viz/zeitachse.js js/viz/dotPlot.js
  → alle drei Module rufen die neuen Einstiegspunkte auf
grep -n "oeffneLightbox" js/utils/sidebar.js
  → Import + Aufruf in baueFotogalerie() vorhanden
```

`js/utils/lightbox.js` und `js/viz/regestenKachelraster.js` wurden in
dieser gesamten Sitzung kein einziges Mal editiert (keine Edit/Write-
Aufrufe) - Nicht-Ziele beider Dateien damit durch Unterlassung erfüllt,
nicht nur behauptet.

---

## 2026-09-09 (13) – Sidebar-Liste: Regest-Vorschauzeile & Inline-Detailansicht statt Navigation

**Auftrag (Kurzfassung):** Die schlanke Sidebar-Urkunden-Liste (Signatur +
Kategorie, per Vorauftrag "Kalender-Heatmap-Korrekturen, Sidebar-Umbau,
Kategorie-Umbenennung" so entstanden) bekommt eine Regest-Vorschauzeile pro
Eintrag; Klick auf einen Eintrag öffnet statt einer Navigation zum
Regesten-Kachelraster eine vollständige Detailansicht (alle Metadatenfelder
+ Fotogalerie) INNERHALB der Sidebar, mit "← Zurück"/"×" in der Kopfzeile.
Referenz: ein Screenshot des Alpha-Prototyps (`Desktop/Master-Vis`, ein
unabhängiges, älteres Projekt derselben Masterarbeit - siehe unten,
"Herkunft des Referenz-Screenshots"), der eine bereits vorhandene, ähnliche
Detailansicht dort zeigt.

### Herkunft des Referenz-Screenshots (Selbstauskunft)

Der vom Auftraggeber mitgeschickte Screenshot stammte aus einer Browser-URL
`file:///C:/Users/ali/Desktop/Master-Vis/index.html`, NICHT aus `GI_2.0`
(diesem Projekt) - ein separates, älteres, monolithisches Vorprojekt
(einzelne sehr große JS-/Python-Änderungsskript-Dateien statt der
ES-Modul-Struktur hier, siehe `ls Desktop/Master-Vis`). Vor Beginn geprüft,
ob `js/utils/sidebar.js`/`kalenderHeatmap.js` überhaupt in DIESEM Projekt
existieren (Auftrag nennt sie explizit als "Betroffene Dateien") - beide
vorhanden, daher als Bestätigung gewertet, dass GI_2.0 (nicht Master-Vis)
das Ziel dieses Auftrags ist und der Screenshot rein als visuelle
UX-Referenz für die gewünschte Feldreihenfolge/das Fotogalerie-Verhalten
diente, nicht als zu bearbeitende Codebasis.

### Punkt 1 (Regest-Vorschauzeile)

`baueUrkundenListeInhalt()` (`js/utils/sidebar.js`) bekommt pro Listeneintrag
ein zusätzliches `<p class="bestand-sidebar-urkunden-regest">` mit dem
VOLLEN `record.regest`-Text; die Ein-Zeilen-Kürzung mit „…" passiert rein
über CSS (`white-space:nowrap; overflow:hidden; text-overflow:ellipsis`),
NICHT über eine JS-Zeichenanzahl-/Pixel-Kürzung wie in den SVG-Modulen
(z. B. dotPlot.js' `ermittleBeschriftungstext()`) - dort ist CSS-Textkürzung
mangels SVG-Unterstützung keine Option, hier (echtes HTML-`<p>`) ist sie die
robustere Standardlösung (funktioniert bei jeder Panel-Breite ohne
Pixel-Messung, voller Text bleibt im DOM für z. B. Screenreader/Suche im
Browser). Live mit einem sehr langen Regest-Text (StAK-UrkKr-0567, >1000
Zeichen) geprüft: volltext im DOM (`el.textContent`), sichtbar nur eine
gekürzte Zeile.

### Punkt 2 (Inline-Detailansicht)

**Neue Funktion `baueUrkundenDetailInhalt(record)`** in `js/utils/sidebar.js`,
bewusst NICHT eine Erweiterung der bestehenden, Bestandsverzeichnis-
spezifischen `baueSidebarInhalt()`/`STANDARD_SIDEBAR_FELDER` (fünf
bestehende, hier nicht zu ändernde Aufrufer: treemap.js/sunburst.js/
icicle.js/circlePacking.js/ganttDiagramm.js) - dieselbe Architektur-
Entscheidung, die bereits `baueUrkundenListeInhalt()` selbst und
zeitachse.js' lokale `baueUrkundenSidebarInhalt()` begründet haben (siehe
deren jeweilige Dateikopf-Kommentare): Urkunden- und Bestand-Schema sind
grundverschieden, eine Vermischung wäre riskant für die unbeteiligten
Aufrufer.

**Feldreihenfolge exakt wie im Auftrag vorgegeben** (Fotogalerie, Signatur,
Datum, Regest, Kategorien, Orte, Personen) - bewusst NICHT identisch zur
Reihenfolge der aufgeklappten Kachelraster-Ansicht (dort: Signatur-Titel,
Datum, Orte, Personen, Kategorien, Regest, Fotos, siehe
regestenKachelraster.js' `baueKarte()`), da der Auftrag eine eigene
Reihenfolge vorgibt; die FELDAUSWAHL selbst (welche Felder) ist identisch.
Signatur erscheint sowohl als Sidebar-Kopfzeilen-Titel (wie bisher bei
Listen/Zellen-Titeln) als auch als eigenes Feld im Textkörper - exakt wie im
mitgeschickten Referenz-Screenshot zu sehen.

**Kategorien-Feld** ist eine neue, lokale `baueUrkundenKategorienFeld()`
(Label "Kategorien" + Badge-Reihe darunter, `.bestand-sidebar-feld`/
`.bestand-sidebar-badges`-Klassen wiederverwendet) - anders als
`baueUrkundenListeInhalt()`s Badges (dort bewusst ohne Label, schlanke
Listendarstellung), weil die Detailansicht laut Auftrag dieselbe
Label+Wert-Struktur wie die übrigen Felder durchziehen soll.

**Fotogalerie** (`baueFotogalerie()`): eigene, schlanke Umsetzung statt der
bestehenden geteilten Lightbox (`js/utils/lightbox.js`) - Auftrag
ausdrücklich "kein Lightbox-Overlay nötig, Wechsel bleibt innerhalb der
Sidebar". Nutzt dieselbe Datenquelle wie regestenKachelraster.js'
`baueFotoBereich()` (`ladeFotos()`/`data/foto_manifest.json`), aber eine
EIGENE, nicht identische Implementierung: dort ist zusätzlich Lazy-Loading
per `IntersectionObserver` nötig (bis zu ~1000 gleichzeitig gerenderte
Kacheln), hier wird immer nur eine einzelne Urkunde auf einmal angezeigt
(Sidebar-Detailansicht) - ein einfacher `ladeFotos().then(...)`-Aufruf beim
Öffnen reicht, kein Beobachter nötig. Struktur: Hauptbild (`<img>`, erstes
Foto) + bei mehr als einem Foto eine Thumbnail-Reihe darunter; Klick/Enter/
Leertaste auf ein Thumbnail tauscht nur `src`/`alt` des Hauptbilds und die
`.bestand-sidebar-foto-thumb-aktiv`-Markierung, kein Navigations-/Router-
Zustand. Kein `foto_ordner` bzw. 0 Dateien im Manifest → die Galerie bleibt
ein leeres `<div>`, das per `.bestand-sidebar-fotogalerie:empty { display:
none; }` unsichtbar kollabiert (kein "Foto folgt"-Platzhalter - Auftrag
verlangt nur eine bedingte Anzeige "falls Fotos vorhanden", kein
Platzhaltertext für den Leerfall).

### Punkt 3 (Zurück/Schließen)

**`baueSidebarGeruest()`** (`js/utils/sidebar.js`) bekommt einen dritten
Kopfzeilen-Button `zurueckBtn` ("← Zurück"), per `hidden`-Attribut
standardmäßig unsichtbar (UA-Stylesheet `[hidden]{display:none}`, nimmt
keinen Platz ein) und daher additiv/risikofrei für alle sieben bereits
bestehenden Aufrufer - live geprüft (Treemap: Sidebar öffnet identisch wie
vorher, `zurueckBtn` im DOM vorhanden aber `getComputedStyle(...).display
=== 'none'`, keine Layout-Verschiebung). Nur `kalenderHeatmap.js` blendet
ihn per `zurueckBtn.hidden = false` ein und verdrahtet den Klick (dasselbe
Verdrahtungs-Muster wie beim bestehenden `schliessenBtn`, siehe
Dateikopf-Kommentar zum Fokus-Fallback).

`kalenderHeatmap.js`: `instanz.aktuelleListe = {titel, records}` merkt sich
die zuletzt gezeigte Liste, `instanz.listenScrollPosition` deren
Scroll-Position (`sidebar.koerper.scrollTop`, im Moment des Detail-Öffnens
gemerkt). `zurueckZurUrkundenListe()` baut dieselbe Liste erneut auf
(`oeffneUrkundenListe()`, identische Daten/Reihenfolge → i. d. R. identische
Zeilenhöhen) und setzt `scrollTop` zurück - "möglichst erhalten" laut
Auftrag, keine exakte Garantie bei zwischenzeitlicher Fenstergrößenänderung
verlangt oder nötig. `oeffneUrkundenListe()` gilt als "Wurzel"-Zustand
(blendet `zurueckBtn` beim Aufruf immer aus, auch beim Zurückkehren aus der
Detailansicht); `schliesseZellenListe()` setzt `zurueckBtn.hidden = true`
zusätzlich beim vollständigen Schließen zurück (Hygiene, verhindert einen
sichtbaren "Zurück"-Zustand beim nächsten Öffnen einer neuen Zelle).

**Entfernter Navigations-Pfad:** die vormalige `navigiereZuKachel()`
(`state.js`' `setZielSignatur()` + `router.js`' `navigiereZu()`) ist die
EINZIGE Stelle in `kalenderHeatmap.js`, die `setZielSignatur()` aufrief
(geprüft per `grep`) - ersatzlos entfernt, mitsamt der jetzt toten Importe.
`state.js`' `zielSignatur`-Mechanismus und `regestenKachelraster.js`' darauf
lesender Code (`clearZielSignatur()`, Punkt-3-Kommentar dort) bleiben
UNANGETASTET (Nicht-Ziel: keine Änderung an anderen Modulen) - sie werden
von hier aus schlicht nicht mehr befüllt, bleiben aber für einen möglichen
künftigen Aufrufer strukturell funktionsfähig. `filterleiste.js`s
`setzeSuchbegriff()` (per `grep` bestätigt: einzig noch von
regestenKachelraster.js aufgerufen) bleibt ebenfalls unverändert bestehen,
exakt wie im Auftrag als Nicht-Ziel benannt.

### Live-Verifikation

Browser-Cache-Falle (siehe Einträge (10)/(11)/(12)) diesmal ANDERS
aufgetreten als zuvor: eine neu geöffnete Tab (bisher zuverlässig) reichte
NICHT aus - `import()` lud weiterhin eine veraltete `sidebar.js`-Version
(`SyntaxError: ... does not provide an export named
'baueUrkundenDetailInhalt'`), obwohl ein `fetch(url, {cache:'no-store'})`
auf denselben Pfad bereits den aktuellen Dateiinhalt lieferte - also ein
HTTP-Disk-Cache-Effekt (python `http.server` sendet keine expliziten
Cache-Control-Header, der Browser cacht heuristisch anhand `Last-Modified`;
`fetch(cache:'no-store')` umgeht das, `import()` offenbar nicht
zuverlässig, selbst in einer neuen Tab desselben Browser-Profils - anders
als der zuvor beobachtete reine JS-Modul-Registry-Cache, der pro Tab/Realm
neu ist). Fix: neuer, bisher nie aufgerufener Port (9994) - dort garantiert
keine vorhandenen Cache-Einträge, Fehler verschwand vollständig. Für
künftige Sitzungen als weitere Cache-Spielart neben den bereits
dokumentierten notiert.

Auf Port 9994 (frisch) verifiziert:
- Kalender-Heatmap, Zellklick öffnet Liste MIT Regest-Vorschauzeile pro
  Eintrag (`el.textContent` bestätigt vollen Text im DOM trotz visueller
  Ein-Zeilen-Kürzung).
- Klick auf einen Listeneintrag öffnet die Detailansicht: Fotogalerie
  (Hauptbild + 2 Thumbnails), Signatur/Datum/Regest/Kategorien/Orte/
  Personen vollständig und in der vorgegebenen Reihenfolge (`querySelectorAll
  ('.bestand-sidebar-feld-label')` bestätigt exakt: Signatur, Datum, Regest,
  Kategorien, Orte, Personen).
- Klick auf ein zweites Thumbnail wechselt `hauptbild.src`/`.alt` und die
  Aktiv-Markierung korrekt (per JS geprüft, nicht nur visuell).
- "← Zurück" baut dieselbe Liste (12 Urkunden, „25. Mai") erneut auf,
  Zurück-Button verschwindet wieder (Wurzel-Zustand).
- "×" schließt vollständig (`aria-hidden="true"`, Klasse `offen` entfernt,
  `zurueckBtn.hidden` zurückgesetzt), per JS-Zustandsprüfung bestätigt (ein
  Screenshot mittendrin in der 200ms-Ausblend-Transition hätte sonst
  fälschlich nach "noch offen" ausgesehen).
- Records ohne bzw. mit genau einem Foto nicht einzeln bis zum Leerfall
  durchprobiert (kein 0-Foto-Datensatz beim Stichprobentest getroffen) -
  die Kollaps-Logik (`:empty`-Selektor, `if (urls.length <= 1) return;` vor
  dem Thumbnail-Aufbau) wurde stattdessen per Code-Inspektion verifiziert:
  beide Fälle (kein `foto_ordner`, leeres Manifest-Array) verlassen
  `baueFotogalerie()` synchron bzw. im `.then()` ohne ein Kind-Element
  anzuhängen, die `bereich`-`<div>` bleibt entsprechend leer.
- Alle sieben bestehenden `baueSidebarGeruest()`-Aufrufer stichprobenartig
  geprüft (Treemap: Sidebar öffnet unverändert, `zurueckBtn` im DOM
  vorhanden aber `display:none`, keine Layout-Verschiebung; zeitachse.js:
  eigene, unveränderte Einzelurkunden-Detailansicht - Datum/Orte/Personen/
  Kategorien/Regest ohne Fotogalerie - funktioniert exakt wie zuvor). Keine
  Konsolenfehler bei keinem der getesteten Wege.

### Grep-Verifikation

```
grep -n "baueUrkundenDetailInhalt" js/utils/sidebar.js js/viz/kalenderHeatmap.js
  → export in sidebar.js, Import+zwei Aufrufstellen (Referenz im
    Dateikopf-Kommentar + tatsächlicher Aufruf) in kalenderHeatmap.js
grep -n "navigiereZuKachel\|setZielSignatur\|navigiereZu(" js/viz/kalenderHeatmap.js
  → nur noch in erklärenden Kommentaren, keine Code-Referenz mehr
grep -n "setzeSuchbegriff" js/
  → unverändert: Definition in filterleiste.js, einziger Aufruf weiterhin
    in regestenKachelraster.js
```

---

## 2026-09-09 (12) – „Undatiert (…)"-Beschriftung app-weit entfernt

**Auftrag (Kurzfassung):** Die Beschriftung „Undatiert (0)" unterhalb der
X-Achsen war erneut abgeschnitten/fehlerhaft dargestellt (Dot Plot, per
früherer Selbstauskunft betraf das potenziell ca. 8 gemeinsam nutzende
Module). Statt den Clipping-Fehler erneut zu reparieren: ersatzlos
entfernen, da die Beschriftung laut Auftraggeber nicht gebraucht wird. Die
darunterliegende Zähl-/Verarbeitungslogik für undatierte Urkunden bleibt
unverändert (Nicht-Ziel).

### Punkt 1 – Auffinden aller Vorkommen

`grep -rn "Undatiert" js/` (14 Treffer-Dateien) und gezielt `grep -rn
"zeichneUnbekanntBereich"` ergaben: die tatsächliche Text-Renderstelle ist
EINE einzige geteilte Funktion, `zeichneUnbekanntBereich()` in
`js/utils/urkundenZeit.js` (Zeile 169-200 vor dem Fix). Sie rendert pro
Aufruf: (a) ein graues Rechteck als Sammelfläche, (b) einen
`<text>`-Knoten `${beschriftung} (${eintraege.length})` direkt darüber,
(c) die einzelnen Kacheln (`rect.unbekannt-kachel`) mit Tooltip pro
Eintrag. Nur (b) war Ziel der Entfernung.

**Aufrufende Module (10 Aufrufstellen in 9 Dateien, per
`grep -rln "zeichneUnbekanntBereich" js/` minus `urkundenZeit.js` selbst):**

| Modul | Aufrufstellen | `beschriftung`-Wert (vorher) |
|---|---|---|
| `dotPlot.js` | 2 (Trockenlauf + real) | `'Undatiert'` |
| `swimlanes.js` | 2 | `'Undatiert'` |
| `streamgraph.js` | 2 | `'Undatiert'` |
| `ridgeline.js` | 2 | `'Undatiert'` |
| `horizonChart.js` | 2 | `'Undatiert'` |
| `parallelKoordinaten.js` | 2 | `'Ohne Jahr (hier nicht darstellbar)'` |
| `kalenderHeatmap.js` | 2 (Tag-Modus + Jahrzehnt-Modus) | `'Nicht im Kalender darstellbar (kein exaktes Tagesdatum)'` bzw. `'Nicht darstellbar (kein Monat und/oder Jahr auswertbar)'` |
| `trellis.js` | 1 | `` `${ohneJahr.length} Urkunde(n)` `` |
| `zeitachse.js` | 1 | `'Undatiert'` |

Damit waren es nicht "ca. 8", sondern exakt 9 Module mit 16
`beschriftung:`-Aufrufstellen (Zählweise der ursprünglichen Schätzung
schloss vermutlich `kalenderHeatmap.js`'s zweiten Aufruf bzw.
`parallelKoordinaten.js` nicht ein).

**Bewusst NICHT betroffen (geprüft, nicht blind übernommen):**
- `trellis.js` Zeile 101: ein EIGENER, von `zeichneUnbekanntBereich()`
  unabhängiger `<text>`-Aufruf (`gruppe.append('text')...text('Undatiert')`)
  - das ist der Facet-TITEL der "ohne Jahr"-Kachel, strukturell identisch
  zu den Kategorie-Facet-Titeln aller anderen Facets (`zeichneEinFacet()`,
  gleiches `x=4,y=12,font-size:11,font-weight:bold`-Muster). Er steht NICHT
  unterhalb einer X-Achse (Trellis-Facets haben keine eigene sichtbare
  X-Achse) und trägt keine Anzahl in Klammern - er ist kein Vorkommen des
  im Auftrag beschriebenen Musters. Ihn zu entfernen würde nur DIESE eine
  Facet-Kachel unbeschriftet lassen, während alle Nachbar-Facets weiter
  ihren Kategorienamen zeigen - eine Asymmetrie, die der Auftrag nicht
  verlangt hat (Nicht-Ziel: "keine sonstigen Änderungen an Layout"). Bleibt
  unverändert.
- `marimekko.js`, `alluvial.js`, `sankey.js`: haben ihre eigene,
  unabhängige "Undatiert"-Logik (`gruppiereNachJahrhundertUndKategorie()`
  in `urkundenZeit.js`, Zeile 128: `buckets.push({..., label: 'Undatiert'})`)
  - dort ist "Undatiert" ein regulärer Jahrhundert-Knoten/-Spalte
  (Marimekko-Spalte, Sankey-/Alluvial-Knoten), kein Beschriftungselement
  unterhalb einer X-Achse, und nutzt eine komplett andere Funktion als
  `zeichneUnbekanntBereich()`. Per Dateikopf-Kommentar dieser drei Module
  ausdrücklich als regulärer, nicht stillschweigend ausgeblendeter Datenpunkt
  konzipiert (Abschnitt 12 des Masterprompts). Außerhalb des Auftrags -
  unverändert.

### Punkt 2 – Entfernen

**In `js/utils/urkundenZeit.js`** (einzige Stelle mit inhaltlicher
Code-Änderung): der `bereich.append('text')...text(...)`-Aufruf entfernt,
`beschriftung` aus der Parameter-Destrukturierung entfernt (wird von der
Funktion nicht mehr gebraucht). Die Höhenformel (`bereichsHoehe`,
`MINDEST_HOEHE_LEER`) bewusst UNVERÄNDERT gelassen - sie wird weiterhin für
die grauen Sammelflächen UND deren Kacheln gebraucht, unabhängig vom Text.
Das bedeutet: die Fläche behält denselben "Sockel" an Platz, den früher auch
die Textzeile brauchte - keine Höhen-/Ausrichtungsänderung an den 9
aufrufenden Modulen ausgelöst (Nicht-Ziel: "keine sonstigen Änderungen an
Achsen, Layout"). Eine Verkleinerung der Fläche um den nicht mehr benötigten
Text-Platz wäre eine zusätzliche, nicht beauftragte Layout-Änderung gewesen.

**In allen 9 aufrufenden Modulen:** die jetzt toten `beschriftung: '...'`
-Zeilen in allen 16 Aufrufstellen entfernt (reine Löschung einer nun
ungenutzten Config-Property, keine Änderung an `breite`/`yStart`/`farbeFn`/
`tooltipTextFn`/`container` oder sonstiger Logik). Syntax-Check nach jeder
Änderung via `node --input-type=module --check < datei.js` (korrekte,
ESM-fähige Prüfmethode - siehe Eintrag (10)/(11) zur Begründung, warum
`node --check datei.js` ohne dieses Flag hier NICHT ausreicht).

### Live-Verifikation

Frischer Browser-Tab verwendet (nicht nur Hard-Refresh derselben Seite) -
siehe Einträge (10)/(11): dynamisch per `import()` geladene ES-Module
können in diesem Setup einen Hard-Refresh überleben, ein neuer Tab umgeht
das zuverlässig. Für jedes der 9 Module per `Ansicht`-Dropdown angewählt und
per `document.querySelectorAll('svg text')` alle tatsächlich gerenderten
Text-Knoten ausgelesen:

- **Dot Plot, Swimlanes, Streamgraph, Ridgeline, Horizon Chart,
  Parallelkoordinaten, Zeitachse:** je 0 Treffer für "Undatiert"/"Ohne
  Jahr"-Text; Achsen-Ticks und Kategorie-/Zeilenbeschriftungen unverändert
  vorhanden.
- **Kalender-Heatmap:** in BEIDEN Modi (Monat×Tag UND Jahrzehnt×Monat,
  jeweils mit aktiviertem "Unsicherheiten anzeigen", da die Fläche nur dann
  überhaupt gerendert wird) 0 Treffer für "arstellbar"; die farbige
  Kachel-Leiste (53 bzw. mehr Einträge) bleibt sichtbar und mit Tooltip
  bedienbar, nur ohne die vormalige Überschrift.
- **Trellis:** 0 Treffer für "ndat"/"Urkunde(n)" als Bestandteil der
  Sammelflächen-Beschriftung; die separate Facet-Titel-Beschriftung
  "Undatiert" (siehe Punkt 1, bewusst nicht Teil dieses Auftrags) blieb wie
  vorgesehen unangetastet sichtbar.

Keine Konsolenfehler bei keinem der 9 Modul-Wechsel
(`read_console_messages` mit `onlyErrors`). Die grauen Sammelflächen selbst
(Hintergrundrechteck, `fill:#f4f4f4`) sind live per
`document.querySelectorAll('rect')`-Check weiterhin vorhanden und in
identischer Höhe wie vor dem Fix (z.B. Kalender-Heatmap Tag-Modus:
`height="66"` mit 53 Einträgen unverändert vor/nach der Entfernung) - kein
Platz-/Ausrichtungsfehler durch den Wegfall der Textzeile.

**Vorher/Nachher-Screenshots (siehe Chat-Verlauf dieser Sitzung) für zwei
Module angefertigt:** Dot Plot (vorher: "Undatiert (0)" sichtbar unterhalb
der Jahres-Achse; nachher: Fläche unverändert an derselben Position, ohne
Text) und Kalender-Heatmap Tag-Modus (vorher: "Nicht im Kalender darstellbar
(kein exaktes Tagesdatum) (53)" über der Kachel-Leiste; nachher: Kachel-
Leiste unverändert, ohne Überschrift). Für die "Vorher"-Aufnahmen wurde die
entfernte Textzeile temporär (mit den ursprünglichen `beschriftung`-Werten)
wiederhergestellt, fotografiert, und unmittelbar danach exakt auf den
verifizierten Fix-Stand zurückgesetzt (erneuter Syntax-Check + erneute
`grep`-Nullprobe nach dem Zurücksetzen bestätigten den identischen
End-Zustand).

### Grep-Verifikation (Abschluss)

```
grep -rn "text().*beschriftung.*eintraege.length" js/   → 0 Treffer
grep -rn "beschriftung:" js/                              → 0 Treffer
```

Verbleibende `grep -rln "Undatiert" js/`-Treffer (11 Dateien) sind
ausschließlich: (a) erklärende Kommentare zu diesem und früheren Aufträgen,
(b) interne Variablennamen wie `reserviertFuerUndatiert`/`svgUndatiert`
(nie im DOM sichtbar), (c) `trellis.js`s Facet-Titel und (d)
`marimekko.js`/`alluvial.js`/`sankey.js`/`urkundenZeit.js`s davon
unabhängige Jahrhundert-Bucket-Logik - alle vier Kategorien wie oben unter
Punkt 1 begründet bewusst außerhalb des Auftrags.

---

## 2026-09-08 (11) – Nachtrag zu Eintrag (10): Cache-Ursache bestätigt, weiterhin kein Code-Defekt

**Betrifft:** keine Code-Änderung. Kurzfassung in `CHANGELOG.md`. Der
Auftraggeber meldete den in Eintrag (10) als "wahrscheinlich Cache"
eingeschätzten Fehler nach eigenem Hard-Refresh (Strg+Shift+R) als
weiterhin reproduzierbar, mit dem exakten Konsolenfehler: `SyntaxError: The
requested module '../config/constants.js' does not provide an export named
'ACHSEN_SCHRIFTGROESSE'` in `dotPlot.js:213:10`, `swimlanes.js:16:22`,
`ganttDiagramm.js:40:10`.

### Erneute, tiefere Prüfung

**Byte-Ebene:** `xxd`-Hexdump der Export-Zeile in `constants.js` (`export
const ACHSEN_SCHRIFTGROESSE = 14;`) gegen alle sieben Import-Stellen
(`dotPlot.js`, `ganttDiagramm.js`, `swimlanes.js`, `ridgeline.js`,
`horizonChart.js`, `streamgraph.js`, `parallelKoordinaten.js`) - identische
ASCII-Schreibweise überall, keine unsichtbaren Unicode-Zeichen, kein
Tippfehler, keine abweichende Groß-/Kleinschreibung.

**Direktes `import()` im echten Browser** (die vom Auftraggeber explizit
verlangte Prüfungsart - "nicht nur isolierte Syntaxprüfung, sondern
tatsächliche Modul-Auflösung"): `constants.js` UND alle sechs betroffenen
Viz-Module einzeln per `await import(pfad)` in der Browser-Konsole geladen
(Testport 9990, frisch) - `constants.js` lieferte korrekt
`{ACHSEN_SCHRIFTGROESSE: 14, CAT_COLORS: {...}}`, alle sechs Module lösten
sich fehlerfrei auf (`hasRender:true` für jedes). Dies ist exakt derselbe
Auflösungs-Mechanismus, den der Browser beim regulären Laden verwendet -
kein synthetischer Test.

**Suche nach einer zweiten `constants.js`-Kopie:** vollständige Suche im
Benutzerprofil (`find "C:\Users\ali" -iname "constants.js"`) ergab nur einen
irrelevanten Treffer in einer Chrome-Erweiterung
(`.../Extensions/.../student-detection/constants.js`, Adobe-Acrobat-
Erweiterung, thematisch unabhängig). Eine bereits vorhandene, unabhängige
Alt-Version des Projekts (`Desktop/GitHub/Interface-Krems`) wurde geprüft
und ausgeschlossen - sie enthält KEINEN `js/`-Ordner (flache
`index.html`+Bild-Assets, eine ältere Single-File-Vorstufe) und kann daher
nicht die Quelle einer widersprüchlichen `constants.js` sein. `GI_2.0`
selbst ist kein Git-Repository (`git status` bestätigt "not a git
repository") - keine Worktree-/Branch-Verwechslung möglich.

**Interessanter Zwischenbefund, der die weitere Diagnose lenkte:** die vom
Auftraggeber gemeldeten Zeilen/Spalten (`dotPlot.js:213:10`,
`swimlanes.js:16:22`, `ganttDiagramm.js:40:10`) stimmten EXAKT mit den
Positionen der `import`-Anweisungen im AKTUELLEN Dateistand überein - das
deutete darauf hin, dass die drei Modul-Dateien in der Sitzung des
Auftraggebers bereits FRISCH geladen wurden, aber `constants.js` selbst
NICHT - ein modul-spezifischer, nicht pauschaler Cache-Effekt, der die
Verwirrung erklärt, warum ein allgemeiner Hard-Refresh ihn nicht behob.

### Rückfrage und Bestätigung

Da eine Cache-Ursache trotz gemeldetem Hard-Refresh nicht ausgeschlossen
werden konnte (Strg+Shift+R verwirft nicht in jeder Chrome-Version
zuverlässig JEDEN Eintrag im dynamischen `import()`-Modul-Cache, siehe
Doku-Hinweise zu `disk cache`/`memory cache`-Verhalten für Skript-
Ressourcen), wurde der Auftraggeber gezielt nach der genutzten Test-URL
gefragt (bestätigt: `localhost:8000`, ein vom Auftraggeber selbst
betriebener, von diesem Werkzeug unabhängiger Server) sowie um einen
Test in einem NEUEN Inkognito-Fenster gebeten (umgeht garantiert jeden
Browser-Cache, unabhängig von Chrome-Version/Refresh-Methode).

**Ergebnis: im Inkognito-Fenster funktioniert der Aufruf fehlerfrei.**
Damit ist zweifelsfrei bestätigt: **Browser-Cache-Effekt im ursprünglichen
Fenster, kein Code-Defekt.** Die lange offene Browser-Sitzung des
Auftraggebers (über mehrere, kurz aufeinanderfolgende Bearbeitungsrunden an
denselben Dateien hinweg, siehe Einträge (9)/(10)) hatte eine veraltete
`constants.js`-Modul-Version im Cache behalten, während die drei
Viz-Module (aus einem noch nicht vollständig geklärten Grund - vermutlich
durch den zuvor bereits erfolgten Fehlversuch, einen Hard-Refresh
durchzuführen, der einen TEIL der Ressourcen bereits neu geladen hatte)
bereits aktualisiert waren.

**Keine Code-Änderung vorgenommen** - das Verhalten der App selbst ist
korrekt, die Ursache lag ausschließlich in der Browser-Sitzung des
Auftraggebers. Test-Infrastruktur (`gi2-test-importfix`, Port 9990)
zurückgebaut.

---

## 2026-09-08 (10) – Dringende Fehlermeldung "sechs Module nicht aufrufbar": kein Code-Defekt gefunden, Diagnose + Verifikation aller 15 zuletzt bearbeiteten Module

**Betrifft:** keine Code-Änderung (Diagnose-Auftrag). Kurzfassung in
`CHANGELOG.md`. Meldung: Dot Plot, Streamgraph, Ridgeline, Gantt, Swimlanes,
Horizon Chart nicht mehr über das Dropdown aufrufbar - URL ändert sich beim
Klick nicht, was auf einen Fehler VOR dem eigentlichen Rendern hindeutet.

### Schritt 1 - Diagnose

**Statischer Syntax-Check (alle sieben in den letzten beiden Aufträgen
geänderten Dateien, inkl. der gemeinsam genutzten `constants.js`):**
`node --check <datei>.js` lieferte zunächst irreführend saubere Ergebnisse
für ALLE Dateien - bei genauerer Prüfung stellte sich heraus, dass `node
--check` ohne `--input-type=module` und ohne `package.json` mit
`"type":"module"` `import`/`export`-Syntax nicht wie ein Browser-ES-Modul
prüft und selbst einen deliberately kaputten Testfall (fehlende schließende
Klammer am Dateiende) NICHT erkannte. Korrigiert: `node --input-type=module
--check < datei.js` (Zufuhr über stdin, damit Node den ESM-Parser
verwendet) - dieser korrigierte Test erkannte den deliberately eingebauten
Fehler zuverlässig (`SyntaxError: Unexpected end of input`). Mit der
korrigierten Methode: **alle sieben Dateien (`dotPlot.js`, `streamgraph.js`,
`ridgeline.js`, `ganttDiagramm.js`, `swimlanes.js`, `horizonChart.js`,
`parallelKoordinaten.js`, `js/config/constants.js`) syntaktisch fehlerfrei,
keine fehlende Klammer/kein fehlendes Komma.**

**Live-Reproduktion der exakten gemeldeten Bedienfolge (Testport 9980,
frisch):**
1. Direkte Hash-Navigation (kalter Seitenaufbau) zu `#bestand/ganttDiagramm`
   - rendert korrekt, keine Konsolenfehler.
2. Von Treemap (funktionierend) per Dropdown zu Gantt-Diagramm gewechselt
   (`form_input` auf das `<select>`, dieselbe `change`-Event-Auslösung wie
   ein echter Nutzer-Klick) - `location.hash` änderte sich korrekt zu
   `#bestand/ganttDiagramm`, Inhalt rendert, keine Konsolenfehler.
3. Von Regesten-Kachelraster (Standard-Landing-Ansicht der Visualisierungen)
   per Dropdown zu Dot Plot gewechselt - `location.hash` änderte sich
   korrekt zu `#visualisierungen/urkunden/dotPlot`, Inhalt rendert.
4. Direkte Wechsel-Sequenz ZWISCHEN mehreren der sechs gemeldeten Module
   (Streamgraph → Ridgeline → Swimlanes → Horizon Chart → Dot Plot, ohne
   Zwischenstopp bei einem funktionierenden Modul) - jeder Wechsel
   aktualisierte die URL korrekt und rendert korrekt.

**Ergebnis: der gemeldete Fehler konnte in KEINEM der genannten Szenarien
reproduziert werden.** Keine Konsolenfehler in jedem einzelnen Testschritt
(`read_console_messages` nach jedem Wechsel geprüft).

**Routing-Verhalten bei einem fehlschlagenden Modul-Import geprüft (Frage
aus dem Auftrag, wörtlich: "fängt die Routing-Funktion selbst einen stillen
Fehler ab, ohne die URL zu aktualisieren"):** `js/core/app.js`s
`ladeModulUndRender()` (in BEIDEN Vorkommen - `renderBestandTab()` Zeile
168 UND `renderVisualisierungenTab()` Zeile 234, strukturell identisch):

```js
async function ladeModulUndRender(eintrag) {
  const mod = await import(eintrag.modulPfad);
  if (meineGeneration !== generation) return null;
  unsicherheitsButton.setzeZurueck();
  aktualisiereKleinerBildschirmHinweis(kleinerBildschirmHinweis, eintrag.id);
  mod.render(vizContainer, records, { showUncertainty: getZustand().unsicherheitModusAktiv });
  kontext.ansichtId = eintrag.id;
  kontext.aktuellesVizModul = mod;
  navigiereZu(['bestand', eintrag.id]); // URL-Update - ERST HIER, NACH import()+render()
  return mod;
}
```

**Bestätigt: `navigiereZu()` (URL-Update) steht bewusst AM ENDE der
Funktion, NACH `import()` UND `render()`.** Ein fehlschlagender Import
(z. B. `SyntaxError` beim Parsen, fehlender Export) ODER ein werfendes
`render()` würde die Funktion vorher per Exception verlassen -
`navigiereZu()` würde NIE erreicht, die URL bliebe unverändert. Das
entspricht EXAKT dem gemeldeten Symptom. `js/core/ansichtWechseln.js`s
`wechsleZu()` (der Dropdown-`change`-Handler) fängt diese Exception bewusst
NICHT ab (nur `try/finally`, kein `catch` - siehe dortiger Kommentar zum
Bugfix "Info-Button-Absturz in Kalender-Heatmap") - **die Routing-Logik
verschluckt den Fehler also NICHT still**, er bliebe als (unhandled-
promise-rejection-)Konsolenfehler sichtbar. In allen eigenen Testläufen trat
jedoch nie ein solcher Fehler auf.

### Schritt 2 - Root-Cause-Einschätzung

Da der Mechanismus, der das gemeldete Symptom erzeugen WÜRDE, eindeutig
identifiziert ist (fehlschlagender Import/Render vor `navigiereZu()`), aber
kein tatsächlicher Auslöser dafür im aktuellen Datei-Stand gefunden werden
konnte, ist die wahrscheinlichste Erklärung ein **zwischenzeitlich
veralteter Browser-Cache-Zustand** in der Sitzung, in der der Fehler
beobachtet wurde:
- Der Python-Testserver (`http.server`) sendet KEINEN `Cache-Control`-Header
  (live per `fetch()`.headers geprüft) - Browser greifen dadurch auf
  heuristisches Caching zurück, das in einer lange geöffneten Browser-
  Sitzung mit mehreren, kurz aufeinanderfolgenden Bearbeitungsrunden an
  denselben Dateien (wie den letzten beiden Aufträgen, die exakt dieselben
  sechs bzw. sieben Dateien wiederholt änderten) zu einer Inkonsistenz
  zwischen bereits geladenen und neu angeforderten Modul-Versionen führen
  kann.
- Genau diese Klasse von Cache-Problem trat in DIESER Sitzung bereits
  mehrfach auf (siehe Eintrag (9): ein `.attr('font-size', ...)` blieb nach
  einer Bearbeitung scheinbar wirkungslos, bis sich herausstellte, dass es
  sich um ein d3-internes Overwrite-Verhalten handelte - dabei wurde
  zusätzlich mehrfach ein tatsächliches Modul-Cache-Problem beobachtet und
  nur durch einen Wechsel auf einen frischen Port zuverlässig behoben,
  siehe dortiges Protokoll) - dieselbe Systematik ("fresh port pro
  Testrunde") ist als etablierte Regel für diesen Server-Typ bereits
  dokumentiert.
- Der vom Auftraggeber zuvor gezeigte Screenshot lief auf `localhost:8000`
  - einem eigenen, von diesem Werkzeug unabhängigen Dev-Server/Browser-Tab,
  der über mehrere Bearbeitungsrunden hinweg offen geblieben sein könnte,
  ohne zwischenzeitlich hart neu geladen zu werden.

**Empfehlung statt Code-Änderung:** harter Reload (Strg+Shift+R bzw.
Cmd+Shift+R) im betroffenen Browser-Tab, alternativ ein neuer Tab/Port.
Sollte der Fehler danach weiterhin auftreten, wäre das ein starkes Signal,
dass es sich NICHT um Caching handelt, sondern um einen bislang nicht
reproduzierten, umgebungsspezifischen Fehler - in dem Fall wäre eine exakte
Fehlermeldung aus der Browser-Konsole des Auftraggebers der nächste
notwendige Schritt, da dieses Werkzeug den Fehler trotz identischem
Datei-Stand und identisch nachgestellter Bedienfolge nicht auslösen konnte.

### Vollständige Verifikation aller 15 zuletzt bearbeiteten Module

| Modul | Aufruf-Pfad getestet | URL korrekt | Rendert | Konsolenfehler |
|---|---|---|---|---|
| Gantt-Diagramm | direkte Hash-Navigation UND Dropdown von Treemap | ✓ | ✓ | keine |
| Sunburst | Dropdown von Gantt | ✓ | ✓ | keine |
| Icicle | Dropdown von Sunburst | ✓ | ✓ | keine |
| Circle Packing | Dropdown von Icicle | ✓ | ✓ | keine |
| Treemap | Ausgangspunkt/direkte Hash-Navigation | ✓ | ✓ | keine |
| Dot Plot | Dropdown von Regesten-Kachelraster UND von Horizon Chart | ✓ | ✓ | keine |
| Streamgraph | Dropdown-Sequenz (s.o.) | ✓ | ✓ | keine |
| Ridgeline | Dropdown-Sequenz (s.o.) | ✓ | ✓ | keine |
| Swimlanes | Dropdown-Sequenz (s.o.) | ✓ | ✓ | keine |
| Horizon Chart | Dropdown-Sequenz (s.o.) | ✓ | ✓ | keine |
| Zeitachse | Dropdown von Horizon Chart | ✓ | ✓ | keine |
| Bubble Chart | Dropdown von Zeitachse | ✓ | ✓ | keine |
| Marimekko | Dropdown von Bubble Chart | ✓ | ✓ | keine |
| Alluviales Diagramm | Dropdown von Marimekko | ✓ | ✓ | keine |
| Sankey | Dropdown von Alluvial | ✓ | ✓ | keine |

Alle 15 Module einzeln per `location.hash`-Prüfung UND SVG-Vorhandensein
im DOM verifiziert (nicht nur "Seite lädt", sondern tatsächlich gerendertes
Diagramm bestätigt). `read_console_messages` nach jeder Testrunde geprüft -
durchgehend leer.

---

## 2026-09-08 (9) – Systemischer Clipping-Fix nach Vollbild-Umstellung + einheitliche Achsenbeschriftungsgröße app-weit

**Betrifft:** geändert `js/viz/dotPlot.js`, `js/viz/parallelKoordinaten.js`,
`js/viz/swimlanes.js`, `js/viz/ridgeline.js`, `js/viz/horizonChart.js`,
`js/viz/streamgraph.js`, `js/viz/ganttDiagramm.js`; neu
`ACHSEN_SCHRIFTGROESSE` in `js/config/constants.js`; ergänzt
`docs/VOLLBILD_KONVENTION.md`. Kurzfassung in `CHANGELOG.md`. Setzt auf
Eintrag (7)/(8) auf - Eintrag (8)s Teil A konnte den vom Auftraggeber
gemeldeten Fehler NICHT reproduzieren; dieser Auftrag lieferte einen neuen
Screenshot als konkreten Beleg, der die erneute Analyse mit einer präziseren
Hypothese ermöglichte.

### Teil A - Root-Cause-Bestätigung

**Schritt 1 - Ursache bestätigt, mit exakter Erklärung des
Berechnungsfehlers:** in `dotPlot.js`s Vollbild-Höhenberechnung (Eintrag
(7), Schritt 2) wird die verfügbare Höhe VOR dem Zeichnen wie folgt auf
Zeilen verteilt:

```js
const RESERVIERT_FUER_UNDATIERT = 34; // urspr. Wert - EIN GESCHÄTZTER Sockel
const verfuegbarFuerZeilen = Math.max(verfuegbareHoehe - RAND.oben - RAND.unten - RESERVIERT_FUER_UNDATIERT, 0);
```

Der Wert `34` (= `MINDEST_HOEHE_LEER=24` aus `urkundenZeit.js` + 10px
Puffer) ist ALGEBRAISCH exakt richtig, aber NUR für den einen Fall, für den
er hergeleitet wurde: 0 undatierte Urkunden. Live erneut nachgerechnet
(siehe Eintrag (7) für die vollständige Herleitung): bei unclamped
`zeilenhoehe` gilt `gesamtHoehe = verfuegbareHoehe - RESERVIERT_FUER_UNDATIERT
+ bereichsHoehe(real) + 10` - für `bereichsHoehe=24` kürzt sich das exakt zu
`gesamtHoehe = verfuegbareHoehe`. **Das Problem liegt nicht in dieser
Algebra, sondern darin, dass `RESERVIERT_FUER_UNDATIERT` ein FEST CODIERTER
SCHÄTZWERT ist, kein zur Laufzeit ermittelter tatsächlicher Wert** - jede
künftige Datenänderung (auch nur eine einzige neu hinzukommende undatierte
Urkunde) oder ein bislang nicht exakt reproduzierter Layout-/
Rendering-Unterschied zwischen Testumgebung und dem Browser des
Auftraggebers hätte diese Annahme verletzen können. Kombiniert mit
`.dotplot-plot-bereich{overflow:hidden}` (nötig für die Touch-Pan-Geste,
siehe Eintrag (5)) bedeutet jede Unterschätzung: hartes Abschneiden statt
des sonst überall etablierten Seiten-Scroll-Fallbacks. Das erklärt exakt
das gemeldete Bild (Screenshot: "Undatiert (n)" unmittelbar unter der
x-Achse, unten links abgeschnitten) - ohne dass die ursprüngliche Algebra
selbst je "falsch" gewesen wäre, nur ihre EINE Eingabegröße war eine
Schätzung statt einer Messung.

**Schritt 2 - Fix:** der tatsächliche Platzbedarf wird jetzt per
"Trockenlauf" exakt vorab ermittelt, statt geschätzt - ein Aufruf der
ECHTEN, unveränderten `zeichneUnbekanntBereich()` (aus `urkundenZeit.js`,
NICHT verändert) in eine nie an das DOM angehängte, unsichtbare SVG-Gruppe
(`d3.create('svg')`) liefert exakt denselben Rückgabewert wie der echte
Aufruf später im selben Redraw (der Rückgabewert hängt nachweislich nur von
`breite`/den `ohneJahr`-Einträgen ab, NICHT von `yStart` - siehe
`urkundenZeit.js`s Formel: `bereichsHoehe` wird VOR jeder DOM-Manipulation
berechnet). Keine Formel-Duplikation (die einzige Quelle der Wahrheit
bleibt `zeichneUnbekanntBereich()` selbst), keine Änderung an
`urkundenZeit.js` nötig. Zusätzlich als Sicherheitsnetz: `dotPlot.js`s
`.dotplot-plot-bereich` wechselt von `overflow:hidden` zu
`overflow-x:hidden; overflow-y:visible` (per CSS-Spezifikation faktisch
`overflow-y:auto` - ein interner Scrollbalken statt Seiten-Scroll, siehe
Live-Befund unten) - jede verbleibende Diskrepanz (Rundung, künftige
Layout-Änderungen) führt dadurch zu sichtbarem Scrollen statt zu
Abschneiden, unabhängig von der Berechnung.

**Live-Verifikation an `dotPlot.js` (Testport 9970→9971, frisch wegen
ES-Modul-Caching):**
- 1920×1080 (derselbe Viewport-Bereich wie im gemeldeten Screenshot):
  `svgHeightAttr:778`, `plotBereichClientHeight:805` (SVG passt bequem,
  27px Reserve), `"Undatiert (0)"`-Textunterkante 112px über der
  Fensterunterkante - deutlich sichtbar, kein Clipping.
- 1280×500 (künstlich provozierter MIN-Zeilenhöhe-Grenzfall, der
  Clipping-Risiko-Fall aus der theoretischen Analyse): kein Clipping,
  `plotBereichOverflowY` computed als `"auto"` (CSS-Spezifikations-Effekt
  von `overflow-x:hidden`+`overflow-y:visible` - ein `visible`-Wert neben
  einem Nicht-`visible`-Wert wird zu `auto` normalisiert), aber
  `plotBereichScrollHeight === plotBereichClientHeight` (kein interner
  Scroll nötig, die exakte Berechnung reicht bereits aus) UND
  `bodyScrollHeight(703) > windowInnerHeight(500)` (der globale
  Seiten-Scroll-Fallback bleibt zusätzlich intakt).
- Zoom (`scaleBy`unverändert `k:1→1.5`) und Sidebar-Toggle nach dem Fix
  unverändert funktionsfähig.

### Schritt 3 - systematische Prüfung der übrigen Module

| Modul | Element unterhalb der Achse? | `overflow:hidden`-Wrapper? | Status |
|---|---|---|---|
| `dotPlot.js` | "Undatiert", `zeichneUnbekanntBereich()` | JA (`.dotplot-plot-bereich`) | **betroffen, behoben** (echtes Hard-Clipping-Risiko) |
| `parallelKoordinaten.js` | "Ohne Jahr (hier nicht darstellbar)" | NEIN (SVG direkt in `.viz-inhalt`, `overflow:visible`) | **Berechnung korrigiert** (dieselbe Schätzwert-Ungenauigkeit lag vor), aber strukturell NICHT hart-clipping-gefährdet - live an 1280×560 bestätigt: `svgBottom(660.6) < footerTop(682.6)`, keine Überlappung, auch VOR dem Fix schon nicht reproduzierbar |
| `swimlanes.js` | "Undatiert" | NEIN | **Berechnung korrigiert** (bereits vom parallelen Auftrag mit dem alten Schätzwert-Muster umgesetzt, hier auf den exakten Trockenlauf umgestellt), strukturell nicht hart-clipping-gefährdet |
| `ridgeline.js` | "Undatiert" | NEIN | wie swimlanes.js |
| `horizonChart.js` | "Undatiert" | NEIN | wie swimlanes.js |
| `streamgraph.js` | "Undatiert" | NEIN | **Berechnung korrigiert**, live an 1280×560 bestätigt: `svgBottom(626.6) < footerTop(648.6)` |
| `bubbleChart.js` | keines (`grep` bestätigt: keine `zeichneUnbekanntBereich()`-Nutzung, kein "Undatiert"/"Ohne Jahr"-Text) | NEIN | **nicht betroffen** - kein Element, das clippen könnte |
| `marimekko.js` | keines (undatierte Urkunden fließen als REGULÄRE Spalte ein, kein Sonderbereich, siehe Dateikopf-Kommentar) | NEIN | **nicht betroffen** |
| `alluvial.js` | keines (dieselbe Fold-in-Bucket-Logik wie marimekko.js, `gruppiereNachJahrhundertUndKategorie()`) | NEIN | **nicht betroffen** |
| `sankey.js` | keines (`grep` bestätigt: keine `zeichneUnbekanntBereich()`-Nutzung) | NEIN | **nicht betroffen** |

Bei den 5 "korrigiert, aber nicht hart-clipping-gefährdet"-Modulen ist die
Präzisions-Verbesserung (Trockenlauf statt Schätzwert) eine VORSORGLICHE
Angleichung an den Auftrags-Wortlaut ("Die Höhenberechnung MUSS den
Platzbedarf... mit einberechnen, bevor die verbleibende Höhe verteilt
wird") und an die neu dokumentierte Konvention (Punkt 3c) - nicht die
Behebung eines tatsächlich beobachteten Fehlers bei diesen fünf Modulen.
Kein `overflow-y`-CSS-Wechsel bei diesen fünf nötig/vorgenommen (sie hatten
nie `overflow:hidden`).

### Teil B - einheitliche Achsenbeschriftungsgröße

**Referenzwert:** `zeitachse.js`s `TICK_SCHRIFTGROESSE = 14` (= `var(--fs-sm)`
im Design-System, siehe dortiger Dateikopf-Kommentar: von 10px auf 14px
angehoben, weil 10px bei echten Nutzertests als schwer lesbar galt).
Zusätzlich `ACHSENTITEL_SCHRIFTGROESSE=13` (dortiger, separater Wert nur für
den rotierten Y-Achsentitel) - für diesen Auftrag wurde EINHEITLICH der
größere Tick-Referenzwert (14px) für alle Achsenbeschriftungen (Ticks UND
Titel) in den ÜBRIGEN Modulen verwendet, um kein Zwei-Stufen-System
einzuführen, das der Auftrag nicht verlangt hat.

**Zentrale Konstante statt CSS-Variable, mit Begründung:** `ACHSEN_SCHRIFTGROESSE=14`
neu exportiert aus `js/config/constants.js` (bereits von praktisch jedem
Viz-Modul für `CAT_COLORS` importiert - geringste Kopplung). BEWUSST keine
CSS-Variable direkt referenziert: die meisten Aufrufstellen setzen die
Schriftgröße als SVG-Präsentationsattribut (`.attr('font-size', ...)`),
und Attributwerte werden nicht als CSS geparst - `var(--fs-sm)` würde dort
ignoriert. Eine JS-Konstante funktioniert für `.attr()`-Aufrufe UND
CSS-Klassen-basierte Fälle gleichermaßen.

**Live entdeckte, systemische Falle:** die erste Umsetzung
(`.attr('font-size', ACHSEN_SCHRIFTGROESSE)` VOR `.call(d3.axisBottom(...))`)
zeigte live weiterhin `computed font-size: 10px` an allen sieben Modulen -
zunächst als ES-Modul-Caching-Problem vermutet (mehrere Portwechsel,
`fetch()`-Rohinhalt-Vergleich), dann per direkter `outerHTML`-Inspektion
gefunden: `d3.axis...()` setzt bei JEDEM `.call()`-Aufruf SELBST
`font-size:10` (zusammen mit `fill:none`, `font-family:sans-serif`,
`text-anchor:middle` - Teil seiner eigenen Default-Präsentation, dieselbe
Konvention wie die CSS-Defaults, die d3-axis ansonsten voraussetzen würde) -
ein zuvor per `.attr()` gesetzter Wert wird dadurch SOFORT überschrieben,
bei jedem erneuten `.call()` erneut (insbesondere bei jedem Zoom-Tick in
`dotPlot.js`/`ganttDiagramm.js`, die die Achse bei jeder Transformation neu
`.call()`en). Ein `.attr()` NACH dem `.call()` gesetzt hätte nur bis zum
nächsten Zoom-Tick geholfen - KEIN robuster Fix.

**Robuster Fix - bereits von `zeitachse.js` etabliert, hier erst
entdeckt/übertragen:** `zeitachse.js`s eigener Dateikopf-Kommentar
(`.zeitachse-x-achse`-CSS-Regel) beschreibt GENAU dieses Problem und dessen
Lösung - "Per CSS statt .attr() gesetzt... d3.axisBottom() [schreibt] bei
JEDEM .call(axis) intern selbst attr('font-size', 10)". Diese Lösung
(CSS-KLASSE statt Präsentationsattribut - CSS hat höhere Präzedenz, übersteht
daher jeden erneuten `.call()`) wurde auf alle sieben Module übertragen:
`.dotplot-achse`, `.gantt-x-achse`, `.swimlanes-achse`, `.ridgeline-achse`,
`.horizonchart-achse`, `.streamgraph-achse`, `.parkoord-achse` - je eine
CSS-Regel `font-size:${ACHSEN_SCHRIFTGROESSE}px` in der modul-eigenen
Style-Injektion, die Achsen-Gruppe bekommt die Klasse statt eines
`.attr('font-size', ...)`.

**Angepasste Module mit alt/neu-Werten:**

| Modul | Element | Alt | Neu | Mechanismus |
|---|---|---|---|---|
| `zeitachse.js` | Tick-Achse | 14px | 14px (Referenz, unverändert) | bereits CSS-Klasse |
| `dotPlot.js` | Tick-Achse | 10px | 14px | CSS-Klasse `.dotplot-achse` (neu) |
| `dotPlot.js` | Zeilen-Beschriftung | 11px | 14px | `.attr()` (unbetroffen von der d3-Falle, kein `d3.axis`-Ergebnis; sicher, da bereits pixelgenau über `ermittleBeschriftungstext()` gekürzt) |
| `ganttDiagramm.js` | Tick-Achse | 10px | 14px | CSS-Klasse `.gantt-x-achse` (neu) |
| `swimlanes.js` | Tick-Achse | 10px | 14px | CSS-Klasse `.swimlanes-achse` (neu) |
| `ridgeline.js` | Tick-Achse | 10px | 14px | CSS-Klasse `.ridgeline-achse` (neu) |
| `horizonChart.js` | Tick-Achse | 10px | 14px | CSS-Klasse `.horizonchart-achse` (neu) |
| `streamgraph.js` | Tick-Achse | 10px | 14px | CSS-Klasse `.streamgraph-achse` (neu) |
| `parallelKoordinaten.js` | Tick-Achse (4×, inkl. Kategorie-Achse) | 9px | 14px | CSS-Klasse `.parkoord-achse` (neu) |
| `parallelKoordinaten.js` | Achsentitel (4×) | 11px | 14px | `.attr()` (unbetroffen, reiner `<text>`) |

**Randfälle - bewusst NICHT angehoben, hier explizit gemeldet (Auftrag,
wörtlich: "explizit melden statt stillschweigend eine kleinere Ausnahme zu
setzen"):**
- `swimlanes.js`/`ridgeline.js`/`horizonChart.js`s Zeilen-/Kategorie-
  Beschriftung (weiterhin 11px): nutzen noch die alte, zeichenanzahl-
  basierte Kürzung (`kategorie.length > 22 ? ... : kategorie`), NICHT
  pixelgenau wie `dotPlot.js`s `ermittleBeschriftungstext()`. Eine größere
  Schrift würde denselben 22-Zeichen-Grenzwert auf mehr Pixel abbilden und
  liefe Gefahr, in den Plot-Bereich (`RAND.links=160`) hineinzuragen.
  Empfehlung: in einem eigenen Folgeauftrag erst auf
  `ermittleBeschriftungstext()` umstellen (wie bei `dotPlot.js`), dann
  anheben.
- `ganttDiagramm.js`s Namensspalte (weiterhin `MIN_SCHRIFTGROESSE=11px`):
  horizontal zwar sicher (CSS `text-overflow:ellipsis`, fontgrößen-
  unabhängig), aber die Zeile hat eine FESTE Höhe (`ZEILE_GESAMT=19px`,
  abgestimmt auf die 16px hohen Balken) - eine 14px-Schrift läge nahe an/
  über dieser Höhe, vertikales Überlauf-Risiko ungeprüft/nicht
  ausgeschlossen. Empfehlung: erst prüfen, ob `ZEILE_GESAMT`
  mitwachsen kann/soll, dann anheben.
- Die separate `MIN_SCHRIFTGROESSE=11`-Konvention für IN-Marken-Beschriftung
  (Treemap-Kacheltext, Sunburst-Bogentext, Gantt-Balkentext) bewusst NICHT
  angefasst - das ist eine andere Textkategorie (Text INNERHALB einer
  Datenmarke, nicht an einer Achse), für die eine andere, bereits
  etablierte Mindestgrößen-Konvention gilt.

**Live geprüft, KEIN Randfall (Überlappung ausgeschlossen statt vermutet):**
`parallelKoordinaten.js`s Kategorie-Achse (`d3.axisLeft(skalen.kategorie)`
OHNE `.ticks(5)`-Begrenzung wie die drei numerischen Achsen - zeigt daher
alle 16 Kategorienamen als eigene Ticks) - bei 1280×500px und 1280×350px
(MIN-Höhen-Grenzfall) je 0 Überlappungen gemessen, 8,1px Lücke zwischen
benachbarten Ticks (`getBoundingClientRect()`-Vergleich in Bildschirm-
Y-Richtung, unter Berücksichtigung der bei `d3.scalePoint()` mit
`range:[hoehePlot,0]` UMGEKEHRTEN Tick-Reihenfolge).

**Regressionstest (Testport 9972→9973, frisch wegen ES-Modul-Caching):**
Zoom (`dotPlot.js`: `k:1→1.5`, `ganttDiagramm.js`: `k:1→1.5`, Schriftgröße
bleibt nach Zoom-Tick korrekt bei `14px` - explizit die durch die d3-Falle
zuvor gefährdete Eigenschaft), Sidebar-Toggle (beide Module), Tooltip
(`swimlanes.js`/`horizonChart.js`/`streamgraph.js`/`ridgeline.js` - initial
fälschlich als "kaputt" gewertet, weil der erste `[tabindex]`-Treffer ein
NICHT verdrahtetes, weil leeres/unsicherheits-freies Element war; mit
gezielterer Selektion `[tabindex="0"]` bzw. Iteration über alle Treffer
bestätigt funktionsfähig). Keine Konsolenfehler in jedem Testschritt.

**Direkte Dateiverifikation:** `grep -n "ACHSEN_SCHRIFTGROESSE"` über alle
sieben Module → durchgängig CSS-Klassen-Pattern, keine verbleibende
`.attr('font-size', ACHSEN_SCHRIFTGROESSE)`-Zuweisung auf einer
`d3.axis...()`-gebundenen Gruppe.

### Teil C (Nachtrag zu Eintrag (8)) - Konvention aktualisiert

`docs/VOLLBILD_KONVENTION.md` um zwei Punkte ergänzt: **3c** (Beschriftungen
unterhalb der Hauptachse exakt per Trockenlauf einrechnen statt schätzen,
`overflow-y:visible` als Sicherheitsnetz) und **3d**
(`ACHSEN_SCHRIFTGROESSE`-Konstante + die d3-axis-`.call()`-Übersschreibungs-
Falle samt CSS-Klassen-Lösung, inkl. Randfall-Hinweis zur zeichenanzahl-
vs. pixelbasierten Kürzung). Beide Punkte sind exakt die Art
Detail-Erkenntnis, die den noch offenen 18 Modulen aus Eintrag (8) dieselbe
Nacharbeit ersparen soll.

---

## 2026-09-08 (8) – Dot-Plot-Restfehler (nicht reproduzierbar), Vollbild-Audit aller Module, dauerhafte Vollbild-Konvention

**Betrifft:** Teil A keine Code-Änderung; Teil B geändert `js/viz/bubbleChart.js`,
`js/viz/marimekko.js`, `js/viz/streamgraph.js`, `js/viz/alluvial.js`,
`js/viz/parallelKoordinaten.js`, `js/viz/sankey.js`; Teil C neu
`docs/VOLLBILD_KONVENTION.md`. Kurzfassung in `CHANGELOG.md`.

### Teil A - Dot-Plot-Restfehler: nicht reproduzierbar

**Auftrag, wörtlich:** nicht annehmen, dass dies dieselbe Ursache wie die
beiden vorherigen Fälle ist; Position "unmittelbar unter der
x-Achsen-Beschriftung, unten links" identifizieren.

**Geprüfte Szenarien (alle: 0 geclippte Text-Elemente, ~12-15px
Sicherheitsabstand für die "Undatiert (0)"-Beschriftung, das Element, das
der beschriebenen Position am ehesten entspricht):**
- Viewports 375×667, 480×720, 1280×350, 1280×550, 1280×720, 1280×900,
  1366×650, 1366×768, 1920×1080 (Ancestor-Chain-Check gegen SVG- und
  `.dotplot-plot-bereich`-Grenzen, alle Text-Elemente einzeln)
- Kalter Reload (frischer Testport) UND warmer Reload (`location.reload()`
  auf bereits geladener Seite)
- Direkte Hash-Navigation (`#visualisierungen/urkunden/dotPlot`, ohne über
  die UI zu klicken) - identisches Ergebnis zum UI-Klickpfad
- Zoom-Interaktion, `Unsicherheiten anzeigen`-Toggle
- Gezielt geprüft: Überlappung zwischen x-Achsen-Tick-Beschriftung und dem
  "Undatiert"-Bereich (die naheliegendste Lesart von "unmittelbar unter der
  x-Achsen-Beschriftung") - Lücke durchgehend ≥11,9px, keine Überlappung
- Rest der alten zeichenbasierten Kürzungslogik gezielt gesucht (`grep -n
  ".slice(\|.length >"` in `dotPlot.js`) - keine aktive Fundstelle mehr
  außerhalb eines erklärenden Kommentars

**Ergebnis:** Keine reproduzierbare Clipping-Situation gefunden. Der
zentrale Fix aus Eintrag (6) (`urkundenZeit.js`, `MINDEST_HOEHE_LEER`)
funktioniert nach wie vor korrekt, die Vollbild-Streckung aus Eintrag (7)
hat keine neue Regression eingeführt (die "Undatiert"-Fläche wird
unabhängig von der Zeilenstreckung immer mit demselben festen
`MINDEST_HOEHE_LEER=24`+10px-Puffer reserviert). **Keine Code-Änderung
vorgenommen** - eine Änderung ohne reproduzierbare Ursache hätte das Risiko
getragen, ein bestehendes, korrekt funktionierendes Verhalten zu verändern,
ohne den tatsächlich gemeldeten Fehler zu treffen. Falls der Fehler
weiterhin auftritt, wäre ein Screenshot oder die exakte
Viewport-/Browser-Kombination hilfreich, um ihn hier reproduzieren zu
können.

### Teil B - Vollbild-Audit aller 31 Module

**Vorgehen:** vollständige Liste aller Dateien unter `js/viz/` erstellt (31
Module), die 7 bereits in früheren Aufträgen auf Vollbild-Standard
gebrachten identifiziert (`grep -l "VOLLBILD\|flex-direction: column\|height: 100%"`),
die verbleibenden 24 systematisch geprüft (`render()`/Höhenberechnung
gelesen, auf `clientHeight`-Referenzen geprüft, Inhaltstyp
zeilen-/flächen-/sonstig-basiert eingeordnet).

**Vollständige Liste, alle 31 Module:**

| Modul | Status | Inhaltstyp | Befund |
|---|---|---|---|
| `dotPlot.js` | konform (Vorlage) | Zeile | Eintrag (5)/(7) |
| `ganttDiagramm.js` | konform | Fläche | frühere Etappe |
| `treemap.js` | konform (Vorlage) | Fläche | frühere Etappe |
| `sunburst.js` | konform | Fläche | frühere Etappe |
| `icicle.js` | konform | Fläche | frühere Etappe |
| `circlePacking.js` | konform | Fläche | frühere Etappe |
| `zeitachse.js` | konform | Zeile (Schwarm) | frühere Etappe |
| `bubbleChart.js` | **korrigiert** | Fläche | `hoehe = options.height\|\|container.clientHeight\|\|800` |
| `marimekko.js` | **korrigiert** | Fläche | `hoehePlot` aus `container.clientHeight` abzüglich RAND |
| `streamgraph.js` | **korrigiert** | Fläche | wie marimekko, zusätzlich `RESERVIERT_FUER_UNDATIERT=34` (Undatiert-Bereich) |
| `alluvial.js` | **korrigiert** | Fläche | `hoehePlot = options.height\|\|Math.max(container.clientHeight\|\|500,500)` |
| `parallelKoordinaten.js` | **korrigiert** | Fläche | wie streamgraph (RAND-Abzug + Undatiert-Bereich) |
| `sankey.js` | **korrigiert** | Fläche | wie alluvial |
| `swimlanes.js` | offen | Zeile | `hoehePlot=RAND.oben+kategorien.length*ZEILENHOEHE`, kein Container-Bezug |
| `ridgeline.js` | offen | Zeile | dasselbe Muster wie swimlanes.js |
| `horizonChart.js` | offen | Zeile | dasselbe Muster (Streifen statt Zeilen) |
| `trellis.js` | offen | Zeile (Facet-Grid) | `gesamtHoehe=zeilenAnzahl*FACET_HOEHE` |
| `bipartiterGraph.js` | offen | Zeile (2 Knotenspalten) | `hoehePlot=Math.max(personen.length,urkunden.length)*(...)` |
| `familienbaum.js` | offen | Zeile (Generationsbänder) | `hoehe=RAND.oben+(maxGeneration+1)*GENERATION_HOEHE+RAND.unten` |
| `personenliste.js` | offen (anderer Ansatz nötig) | HTML-Tabelle | kein SVG/Höhen-Problem im üblichen Sinn - `resize()` bewusst No-op ("reflowt selbstständig"), eher eine Scroll-Begrenzungs- als eine Streckungsfrage |
| `korrelationsmatrix.js` | offen (Rückfrage empfohlen) | Matrix | `resize()` bewusst No-op ("feste Rastergröße... nicht nach Containerbreite") - Design-Entscheidung, ob das noch gilt, sollte vor einer Änderung geklärt werden |
| `adjazenzmatrix.js` | offen | Matrix | `hoehePlot=topKnoten.length*ZELLENGROESSE` (Top-40-Deckelung), kein Container-Bezug |
| `wortwolke.js` | offen | Canvas (Wortwolke) | `hoehe=options.height\|\|600` fix - d3-cloud-Spirallayout braucht eine VORAB feste Pixel-Box, vermutlich ähnlich einfach lösbar wie die 6 korrigierten Module |
| `karte.js` | offen | Leaflet-Karte | `mapDiv.style.height=(options.height\|\|600)-PANEL_HOEHE` fix - CSS-Höhe direkt am Kartenelement, vermutlich einfach, aber Leaflet braucht nach Höhenänderung `map.invalidateSize()` (ungeprüft) |
| `verbindungskarte.js` | offen | Karte + SVG-Overlay | wie karte.js, zusätzlich SVG-Overlay-Höhe mitzuführen |
| `bipartiteFlowMap.js` | offen | Karte + Fluss | wie verbindungskarte.js, SVG-Höhe wächst zusätzlich mit Knotenzahl |
| `personennetzwerk.js` | offen | Force-Graph | `hoehe=(options.height\|\|600)-PANEL_HOEHE` fix, speist `forceCenter`/`forceSimulation`-Grenzen |
| `chordDiagramm.js` | offen | Radial (Chord) | `hoehe=options.height\|\|700` fix, `radiusAussen` aus fixem Quadrat abgeleitet - strukturell nah an Fläche (3b), vermutlich mit ähnlichem Muster lösbar |
| `arcDiagramm.js` | offen | Einzelachse (Bögen) | `hoehe=BOGEN_HOEHE_MAX+RAND.unten` fix (290px), nur Breite skaliert bereits mit Knotenzahl |
| `kalenderHeatmap.js` | offen (Rework, nicht nur Ergänzung) | Kalendergitter | 977 Zeilen, nutzt bereits EIGENE Höhenmessung (`ermittleVerfuegbareHoehe()`, basiert auf `window.innerHeight`), aber nach dem ÄLTEREN, von `zeitachse.js` laut dortigen Kommentaren bereits VERLASSENEN Muster - kein einfacher Ergänzungs-Fix, echte Migration nötig |
| `regestenKachelraster.js` | offen (ggf. anderer Ansatz) | Paginiertes Kachelraster | 808 Zeilen, reines CSS-Grid mit Pagination, `resize()` bewusst No-op ("CSS-Grid regelt sein Layout selbst") - Standard-Landing-Ansicht, "Vollbild" bedeutet hier vermutlich etwas anderes als bei einem SVG-Canvas (eher "nutzt die Breite für mehr Spalten" als "streckt die Höhe") |

**Kein Modul war unvollständig/fehlerhaft unabhängig vom Vollbild-Thema**
(alle 24 geprüften Module sind vollständig mit Tooltips, ARIA-Labels,
destroy/resize-Lebenszyklus, Unsicherheits-Kennzeichnung - keine Stubs/TODOs
gefunden).

**In diesem Auftrag korrigiert (6 von 24, alle flächenbasiert OHNE eigene
Werkzeugleiste):** `bubbleChart.js`, `marimekko.js`, `streamgraph.js`,
`alluvial.js`, `parallelKoordinaten.js`, `sankey.js`. Gemeinsames Muster:
da keines dieser 6 Module eine eigene Werkzeugleiste hat (kein
Zoom/Info-Button/Legende, die von der verfügbaren Höhe abgezogen werden
müsste), genügt eine reine `container.clientHeight`-Messung an der Stelle
des vormals fest codierten Höhen-Defaults (Punkt 3b der Konvention, OHNE
den Flex-Wrapper aus Punkt 2, der nur bei einer Werkzeugleiste nötig ist) -
der alte Default-Wert bleibt jeweils als Mindesthöhe erhalten (Punkt 4:
Mindestgröße statt Stauchung). `streamgraph.js`/`parallelKoordinaten.js`
nutzen zusätzlich `zeichneUnbekanntBereich()` (wie `dotPlot.js`) und
reservieren dafür denselben `RESERVIERT_FUER_UNDATIERT=34`-Schätzwert.

**Live-Verifikation (Testport 9961, frisch wegen ES-Modul-Caching):**

| Modul | Höhe vorher (fix) | Höhe bei 1920×1080 | Höhe bei 1280×400 (Mindestwert) |
|---|---|---|---|
| `bubbleChart.js` | 800 | 863 | 480 (Container-Floor) |
| `marimekko.js` | 400 | 863 | 480 (Container-Floor) |
| `streamgraph.js` | 280 | 863 | 480 (Container-Floor, > eigener Mindestwert 280) |
| `alluvial.js` | 500 | 883 | 520 (eigener Mindestwert 500 + Layout-Überschuss) |
| `parallelKoordinaten.js` | 450 | 897 | 514 (Container-Floor-basiert) |
| `sankey.js` | 600 | 863 | 600 (eigener Mindestwert exakt getroffen) |

Bei 1280×400px (Fenster kleiner als `.viz-inhalt`s 480px-Mindesthöhe)
bestätigt: `bodyScrollHeight(823) > windowInnerHeight(400)` - Seite
scrollt korrekt statt zu clippen. Tooltip-Funktion an
`parallelKoordinaten.js` stichprobenartig verifiziert (`mouseenter` zeigt
vollen Urkunden-Tooltip). Keine Konsolenfehler in jedem Testschritt.

**Nicht in diesem Auftrag umgesetzt (18 von 24) - Priorisierungsempfehlung
für Folgeaufträge:**

1. **Hohe Priorität, geringer Aufwand (dieselbe Zeilen-Clamp-Formel wie
   `dotPlot.js`, direkt übertragbar):** `swimlanes.js`, `ridgeline.js`,
   `horizonChart.js` - alle drei nutzen exakt
   `hoehePlot=RAND.oben+kategorien.length*ZEILENHOEHE`, identisch zum
   Dot-Plot-Zustand vor Eintrag (7).
2. **Mittlere Priorität, mittlerer Aufwand (Zeilen-Muster, aber mit
   Eigenheiten, die vor der Umsetzung kurz zu prüfen sind):**
   `bipartiterGraph.js` (zwei unabhängige Knotenspalten - Clamp müsste auf
   die LÄNGERE der beiden Spalten wirken), `familienbaum.js`
   (Generationsbänder, ggf. andere Mindest-/Höchstwerte als 20/44 sinnvoll,
   da Generationen inhaltlich schwerer/wichtiger wirken als einzelne
   Kategorie-Zeilen), `trellis.js` (Facet-Grid - Streckung wirkt hier
   zweidimensional, da mehrere Facetten pro Zeile nebeneinander stehen
   können, nicht nur eine).
3. **Mittlere Priorität, vermutlich einfach lösbar wie die 6 bereits
   korrigierten Module (Fläche ohne Werkzeugleiste), aber NICHT in diesem
   Auftrag verifiziert:** `wortwolke.js`, `chordDiagramm.js`.
4. **Niedrigere Priorität, braucht eine kurze Rückfrage vor der Umsetzung
   (Auftrag: "bei strukturell anderem Muster bitte vorab melden"):**
   `karte.js`, `verbindungskarte.js`, `bipartiteFlowMap.js`,
   `personennetzwerk.js` (Leaflet-Karten - `map.invalidateSize()` nach
   Höhenänderung ist ungeprüft, könnte zusätzliche Sorgfalt brauchen),
   `arcDiagramm.js` (nur eine Achse, "Vollbild" hieße hier vermutlich primär
   Breiten- statt Höhennutzung - zu klären, was hier überhaupt gewünscht
   ist), `korrelationsmatrix.js`/`adjazenzmatrix.js` (beide haben eine
   BEWUSSTE "feste Rastergröße"-Designentscheidung im Code dokumentiert -
   vor einer Änderung zu klären, ob diese Entscheidung noch gilt).
5. **Niedrigste Priorität / eigener, größerer Auftrag:**
   `kalenderHeatmap.js` (977 Zeilen, nutzt ein ÄLTERES
   `window.innerHeight`-basiertes Höhenmuster statt der modernen
   `.viz-inhalt`-Flex-Kette - eine echte Migration, kein einfacher
   Ergänzungs-Fix), `regestenKachelraster.js` (808 Zeilen, paginiertes
   CSS-Grid-Kachelraster - "Vollbild" bedeutet hier vermutlich etwas
   anderes als bei den SVG-Canvas-Modulen, eher Spaltenanzahl als Höhe;
   sollte vor der Umsetzung geklärt werden, was genau gewünscht ist),
   `personenliste.js` (HTML-Tabelle, kein SVG-Höhenproblem im üblichen
   Sinn - eher eine Scroll-Begrenzungs- als eine Streckungsfrage).

### Teil C - dauerhafte Vollbild-Konvention

Neue Datei `docs/VOLLBILD_KONVENTION.md` - fasst die in den Einträgen
(4)-(7) erarbeiteten Muster als verbindliche, wiederverwendbare Checkliste
zusammen: Laufzeit-Messung (`clientHeight`/`clientWidth`) statt Annahme;
eigener Flex-Wrapper (`display:flex;flex-direction:column;height:100%`) NUR
bei eigener Werkzeugleiste, sonst genügt eine reine Höhenmessung (neue
Erkenntnis aus diesem Auftrag, siehe die 6 korrigierten Module); Punkt
3a (Zeilen-Clamp `[MIN,MAX]`, `dotPlot.js` als Referenzbeispiel `[20,44]`)
vs. 3b (volle Flex-Füllung bei Fläche); Mindestgröße+Scroll-Fallback statt
Stauchung; bestehende `app.js`-Resize-Debounce-Infrastruktur nutzen, keine
eigene; Modul-Vertrag (kein Zustandsverlust bei reiner Höhenänderung).
Enthält eine kurze Abhak-Checkliste sowie die Liste der Referenz-Module.
Künftige Aufträge können sich auf "nach der Vollbild-Konvention umsetzen"
beziehen.

---

## 2026-09-08 (7) – Dot Plot: Vollbild-Streckung, Klärung "erneutes Clipping", Tooltip für Kategorie-Labels

**Betrifft:** geändert `js/viz/dotPlot.js` (einzige Datei - kein anderes
Urkunden-Modul, keine Änderung an der Zoom-/Pan-Logik oder an
`js/utils/zoomSteuerung.js`, per `grep` bestätigt). Kurzfassung in
`CHANGELOG.md`. Setzt auf Eintrag (6) auf.

### Schritt 1 - Root-Cause: erneut abgeschnittenes Label

**Auftrag, wörtlich:** "bitte NICHT den letzten Fix als Ursache annehmen" -
das aktuell beobachtete abgeschnittene Label könnte dieselbe Ursache an
anderer Stelle haben, oder eine komplett neue.

**Vorgehen:** systematische Suche nach JEDER Text-Clipping-Situation, nicht
nur Wiederholung der letzten Prüfung. Getestet:
- Ancestor-Chain-Check für die "Undatiert (0)"-Beschriftung (wie in Eintrag
  (5)/(6)) - weiterhin `clipped:false` (`textBottom:583.61 <
  svgBottom:598.61`), der zentrale Fix greift nach wie vor.
- ALLE 16 Zeilen-Beschriftungen einzeln per `getBoundingClientRect()` gegen
  SVG- und `.dotplot-plot-bereich`-Grenzen geprüft (links/rechts/oben/unten)
  - 0 Treffer.
- Alle Achsen-Tick-Beschriftungen (Jahreszahlen) gegen SVG-/Fenstergrenzen
  geprüft - 0 Treffer.
- `.dotplot-plot-bereich`s `overflow:hidden` STRUKTURELL untersucht: die
  Fläche ist über `flex:1 1 auto` innerhalb der `height:100%`-Kette bis zu
  `.viz-inhalt`s `min-height:480px`-Untergrenze reserviert - bei Bedarf
  wächst `#app-content`/`body` per bereits in `layout.css` dokumentiertem
  Mechanismus über den Viewport hinaus (Seiten-Scroll), BEVOR die Fläche
  selbst kleiner werden könnte als ihr Inhalt - live an 480×720 und
  1280×350px bestätigt (`plotBereichClientHeight` blieb konstant ≥422px,
  `bodyScrollHeight > windowInnerHeight` bei knapper Höhe). Diese
  Kombination verhindert strukturell, dass die aktuelle 16-Zeilen/394px-
  SVG-Höhe je hart geclippt würde, statt zu scrollen - kein Bug, funktioniert
  wie in Eintrag (4)/PROJEKTLOG dokumentiert vorgesehen.
- `Unsicherheiten anzeigen` umgeschaltet (zusätzliche gestrichelte Kreise) -
  keine neue Clipping-Situation.

**Ergebnis:** An KEINER Stelle konnte ein tatsächliches
`overflow:hidden`-Clipping reproduziert werden. Das einzige tatsächlich
UNVOLLSTÄNDIG dargestellte Element ist die Zeilen-Beschriftung "Verkehr,
Ver- und Entsorgung" (echter Kategoriewert, per `awk`/`sort -u` gegen
`urkunden.csv` verifiziert), die durch die bisherige, rein
ZEICHENANZAHL-basierte Kürzung (`kategorie.length > 22 ?
kategorie.slice(0,20)+'…' : kategorie`, OHNE Bezug zur tatsächlich
verfügbaren Pixelbreite) zu "Verkehr, Ver- und En…" verkürzt wurde - ohne
Tooltip-Fallback. Das ist eine bewusste, seit der ursprünglichen
Dot-Plot-Etappe bestehende Design-Entscheidung (Kürzung mit Ellipse), KEIN
CSS-Overflow-Bug - der Auftraggeber hat dieses Erscheinungsbild
offenkundig als "abgeschnitten" wahrgenommen, was aus Nutzer-Perspektive
nachvollziehbar ist, technisch aber ein anderer Fehlerklasse angehört.

**Warum deckte der zentrale Fix (Eintrag (6)) das nicht ab?** Weil es sich
um zwei VOLLSTÄNDIG UNABHÄNGIGE Code-Pfade handelt: der zentrale Fix
korrigierte ausschließlich `urkundenZeit.js`s `zeichneUnbekanntBereich()`
(eine Höhenberechnung für EINE bestimmte Beschriftung, die "Undatiert
(N)"-Sammelfläche). Die hier betroffene Zeilen-Beschriftung ist
modul-lokaler Code direkt in `dotPlot.js`s `zeichneDotPlot()` (die
Kategorienamen-Kürzung), der vom zentralen Fix nie berührt wurde und auch
strukturell nicht hätte berührt werden können - unterschiedliche Funktion,
unterschiedliche Datei, unterschiedliche Fehlerursache (Höhenberechnung vs.
Zeichenanzahl-Kürzung ohne Pixelbezug).

### Schritt 2 - Vollbild durch gestreckten Zeilenabstand

**Umsetzung:** `plotBereich.clientHeight` wird bei JEDEM Redraw gemessen
(direkt nach dem erneuten Einhängen von `plotBereich` in `wurzel` - zu
diesem Zeitpunkt bereits korrekt nach der Werkzeugleiste bemessen, dieselbe
synchrone-Reflow-Technik wie die bereits bestehende
`container.clientWidth`-Messung für `breite`). Verfügbare Höhe für Zeilen =
`verfuegbareHoehe - RAND.oben - RAND.unten - RESERVIERT_FUER_UNDATIERT`
(letzteres ein fester Schätzwert von 34px für den TYPISCHEN 0-Einträge-Fall,
siehe Konstanten-Kommentar in `dotPlot.js`) - daraus Zeilenhöhe =
`verfuegbarFuerZeilen / kategorien.length`, geklemmt auf
`[MIN_ZEILENHOEHE, MAX_ZEILENHOEHE]`. Punktradius =
`PUNKT_RADIUS_BASIS * (zeilenhoehe / MIN_ZEILENHOEHE)` (linear proportional).

**Mindest-/Höchstwerte, mit Begründung (Auftrag verlangt beides):**
- `MIN_ZEILENHOEHE = 20` - unverändert der bisherige kompakte Wert. Diente
  bereits vorher als funktionierende, akzeptierte Zeilenhöhe (keine
  Nutzer-Beschwerde über zu enge Zeilen bei kompakter Darstellung) - der
  Auftrag verlangt genau diesen bisherigen Wert als unteren Richtwert,
  keine eigene Herleitung nötig.
- `MAX_ZEILENHOEHE = 44` - Begründung: 44px ist im Design-System bereits als
  "komfortable Bedien-/Lesegröße" etabliert (dieselbe Fitts'sches-Gesetz-
  Zielgröße wie die Zoom-Buttons in `zoomSteuerung.js`,
  `min-width/min-height:44px`) - mehr als doppelt so groß wie der kompakte
  Wert (nutzt bei großen Bildschirmen sichtbar mehr Fläche), aber nicht so
  groß, dass die Zeilen einer reinen Verteilungsübersicht (Dot Plot zeigt
  DICHTE, keine Einzelfall-Details je Zeile) unnatürlich auseinandergezogen
  wirken - bei 44px bleibt der Bezug "diese Punkte gehören alle zu EINER
  Kategorie-Zeile" optisch klar erkennbar, es entsteht kein Eindruck
  separater Abschnitte.

**Verifikation auf mind. 3 Viewport-Größen (Auftrag, explizit gefordert):**
| Viewport | plotBereich-Höhe | Zeilenabstand (gerendert) | Punktradius | Ergebnis |
|---|---|---|---|---|
| 1920×1080 (groß) | 805px | 41.25px | 7.70px | MAX_ZEILENHOEHE erreicht (44px Zielwert, `padding(0.5)`-Skalenformel ergibt effektiv 15/16×44=41.25px gerenderten Abstand - dieselbe, bereits vor diesem Auftrag bestehende `d3.scalePoint`-Eigenheit) |
| 1280×900 (mittel) | - | 32.29px | 6.03px | Zwischenwert, proportional |
| 1280×350 (klein) | 428px | 20.39px | 3.81px | MIN_ZEILENHOEHE erreicht (Untergrenze), `bodyScrollHeight:703 > windowInnerHeight:350` - Seite scrollt korrekt statt zu clippen (0 geclippte Text-Elemente verifiziert) |

Zusätzlich 1280×720 (Ausgangsgröße) regressionsgetestet - Verhalten dort
weiterhin identisch zum vorherigen Stand (Zeilenabstand nahe am kompakten
Wert, da `.viz-inhalt`s 480px-Mindesthöhe dort noch nicht viel Spielraum
über die 16-Zeilen-Grundhöhe hinaus bietet - passt zur Erwartung, bei einem
"normalen" Laptop-Viewport bleibt die Ansicht kompakt, erst bei echten
großen Monitoren wird gestreckt).

### Schritt 3 - Tooltip für abgeschnittene Kategorie-Labels

**Prüfung `js/utils/beschriftung.js` (Auftrag verlangt explizite
Bestätigung):** DIREKT wiederverwendbar, keine eigene Lösung nötig.
`ermittleBeschriftungstext(name, verfuegbareBreite, schriftgroesse,
zeichenBreiteFaktor?)` ist bereits laut eigenem Dateikopf-Kommentar
geometrieunabhängig gebaut (kennt nur Text + Zahl, keine
Kachel-/Bogen-/Kreis-Geometrie) - hier wird ihr statt einer
Kachelbreite/Bogenlänge/Kreissehne einfach die FESTE Spaltenbreite
(`RAND.links - 8 - BESCHRIFTUNG_PUFFER`) übergeben, exakt dieselbe "geteilte
Formel, modul-lokale Geometrie"-Trennung wie bei den 4 Bestand-Modulen
(Treemap/Sunburst/Icicle/Circle-Packing). Ersetzt die alte
Zeichenanzahl-Heuristik vollständig (kein Nebeneinander zweier
Kürzungslogiken).

**Tooltip-Wiring:** `wireKategorieLabelTooltip()`, neu in `dotPlot.js`,
exakt nach demselben Muster wie `treemap.js`s `wireVerzoegerterTooltip()`
(mouseenter/focus zeigt per `zeigeTooltip()`, mouseleave/blur versteckt) -
NUR wenn `ermittleBeschriftungstext()` einen vom Original abweichenden
(gekürzten) Text zurückliefert, exakt wie bei den 4 Bestand-Modulen (voller
Name zeigt weiterhin keinen Tooltip). Gekürzte Labels bekommen zusätzlich
`tabindex="0"` (Tastatur-Erreichbarkeit) und einen
`:focus-visible`-Fokusring.

**Live verifiziert (an "Verkehr, Ver- und Entsorgung"):**
- Bei 1920×1080 (großzügige Spaltenbreite trotz gestreckter Zeilen, da
  RAND.links horizontal FEST bleibt) reicht die verfügbare Breite für
  "Verkehr, Ver- und Ents…" (mehr Zeichen als die alte 20-Zeichen-Heuristik,
  da jetzt tatsächliche Pixelbreite statt fester Zeichenanzahl zugrunde
  liegt).
- `mouseenter` → Tooltip zeigt `"Verkehr, Ver- und Entsorgung"` (voller
  Name), `aria-describedby` korrekt gesetzt.
- `mouseleave` → Tooltip versteckt (`opacity:0`).
- `label.focus()` → Tooltip zeigt erneut (Tastaturpfad funktioniert
  identisch zum Maus-Pfad).
- `label.blur()` → Tooltip versteckt.
- Von 16 Zeilen-Beschriftungen bekam GENAU 1 (die einzige tatsächlich
  gekürzte) die Tooltip-Verdrahtung - die übrigen 15 (voller Name passt)
  bekamen keine, exakt wie beabsichtigt.

### Regressionstest

Testports 9950→9951 (fresh port wegen ES-Modul-Caching - port 9950 zeigte
zunächst FÄLSCHLICH unveränderte Werte nach `location.reload()`, erst der
Wechsel auf einen neuen Port zeigte die tatsächlich aktualisierte Logik;
festgehalten als erneute Bestätigung der bereits etablierten
"fresh port pro Testrunde"-Regel). **Zoom:** `scaleBy(1.5)`→`k:1.5`,
Reset→`k:1` (unverändert). **Clip-Path:** `#dotplot-punkte-clip rect`
weiterhin `x="160"` (RAND.links bleibt horizontal fest, von der
vertikalen Streckung unberührt). **Sidebar:** Klick öffnet/schließt korrekt
(Toggle). **Info-Button:** Popover öffnet/schließt korrekt. **Zoom-Button-
Umrandung:** weiterhin permanent `rgb(89, 89, 89)` im Ruhezustand (aus
Eintrag (6), unverändert). **Kategorie-Farben:** visuell unverändert (Fix
betrifft nur Zeilenhöhe/Punktgröße/Beschriftung, nicht `farbeFuerKategorie()`).
Keine Konsolenfehler in jedem Testschritt (`read_console_messages` geprüft).

**Direkte Dateiverifikation:** `grep -l "MIN_ZEILENHOEHE\|MAX_ZEILENHOEHE\|ermittleBeschriftungstext"
js/viz/*.js` → `dotPlot.js` plus die 4 bereits vorher nutzenden Bestand-Module
(treemap/sunburst/icicle/circlePacking) - kein NEUES Modul betroffen; `grep
-c "MIN_ZEILENHOEHE" js/viz/ganttDiagramm.js js/utils/zoomSteuerung.js` →
je 0 Treffer (bestätigt: keine Änderung an Gantt oder der gemeinsamen
Zoom-Komponente).

---

## 2026-09-08 (6) – Zentraler Fix für urkundenZeit.js + Permanente Zoom-Button-Umrandung

**Betrifft:** geändert `js/utils/urkundenZeit.js`, `js/viz/dotPlot.js`
(lokalen Guard entfernt, siehe unten), `js/utils/zoomSteuerung.js`. Keine
Änderung an `js/viz/ganttDiagramm.js` selbst - die Button-Optik wird
ausschließlich über die gemeinsame Komponente angepasst. Kurzfassung in
`CHANGELOG.md`. Setzt direkt auf Eintrag (5) auf (dort wurden beide Probleme
erstmals identifiziert - Punkt 2 lokal in `dotPlot.js` behoben, die
Button-Umrandung mit `var(--border)` umgesetzt).

### Teil A - zentraler Fix in urkundenZeit.js

**Auftrag:** den in `dotPlot.js` lokal eingeführten
`MINDEST_HOEHE_LEERER_UNBEKANNT_BEREICH`-Guard nach `urkundenZeit.js`
verschieben, sodass `zeichneUnbekanntBereich()` selbst nie eine zu kleine
Fläche für ihre eigene Beschriftung erzeugt - unabhängig vom aufrufenden
Modul.

**Umsetzung:** neue Konstante `MINDEST_HOEHE_LEER = 24` (Wert unverändert
aus dem vormals lokalen Fix übernommen, siehe Herleitung in Eintrag (5),
Punkt 2 - deckt Baseline+Unterlänge der Beschriftung mit
Sicherheitsabstand ab) direkt in `urkundenZeit.js` platziert. Die
`bereichsHoehe`-Berechnung in `zeichneUnbekanntBereich()` liefert jetzt bei
`eintraege.length === 0` diesen Mindestwert statt `0`:

```js
const bereichsHoehe = eintraege.length === 0
  ? MINDEST_HOEHE_LEER
  : 30 + zeilenAnzahl * (KACHELGROESSE_UNBEKANNT + 4);
```

Da die Hintergrundfläche (`<rect>`) ebenfalls `bereichsHoehe` als Höhe
verwendet, bekommt der "leere" Zustand jetzt zusätzlich einen sichtbaren,
passend dimensionierten Hintergrund statt eines unsichtbaren 0px-Rechtecks -
ein Nebeneffekt, der direkt aus "die Funktion erzeugt nie eine zu kleine
Fläche für ihren eigenen Inhalt" folgt, keine separate Entscheidung.

`js/viz/dotPlot.js` auf den zentralen Fix umgestellt: die Konstante
`MINDEST_HOEHE_LEERER_UNBEKANNT_BEREICH` sowie der `bereichsHoeheSicher`-
Umweg wurden entfernt, `gesamtHoehe` verwendet `bereichsHoehe` jetzt direkt
(`ohneJahrStart + bereichsHoehe + 10`). Der Dateikopf-Kommentar zu Punkt 2
wurde aktualisiert, um auf den jetzt zentralen Fix zu verweisen, statt den
(inzwischen entfernten) lokalen Guard zu beschreiben.

**Vorher/Nachher-Vergleich an Dot Plot (Auftrag, explizit gefordert):**
live vor dem Umbau gemessen: `svgHeightAttr:394`, `undatiertTextBottom:
583.609375 < svgBottom:598.609375` (nicht abgeschnitten, mit dem
vormals LOKALEN Guard). Nach dem Umbau auf den zentralen Fix (frischer
Testport 9940, ES-Modul-Caching-Vorsicht) exakt dieselben Werte erneut
gemessen: `svgHeightAttr:394`, `undatiertTextBottom:583.609375 <
svgBottom:598.609375`. **Identisches Ergebnis** - der zentrale Fix
produziert exakt dieselbe Höhe wie der vormals lokale (beide nutzen
denselben Wert 24), keine Verhaltensänderung an Dot Plot selbst, nur die
Fix-Position wurde verschoben.

**Umfang der Verifikation (Auftrag verlangt explizite Angabe):** ZWEI
Module tatsächlich live gegengeprüft, ein DRITTES als Negativ-Kontrolle
eingeordnet:

1. **Dot Plot** (siehe oben) - Vorher/Nachher am bereits bekannten Fall.
2. **swimlanes.js** (Zweitmodul für den Gegen-Check) - bewusst gewählt,
   weil es denselben UNGESCHÜTZTEN Berechnungs-Pattern wie Dot Plot VOR dem
   Fix verwendet (`grep` bestätigt: `const gesamtHoehe = ohneJahrStart +
   bereichsHoehe + 10`, kein `.remove()`- oder sonstiger Sonderfall bei 0
   Einträgen) - damit ein Modul, an dem der Bug mit hoher Wahrscheinlichkeit
   tatsächlich reproduzierbar gewesen wäre, nicht nur ein beliebiges
   Modul. Live (aktueller Datenstand: 0 undatierte Urkunden in
   `urkunden.csv`, reproduziert den exakten "0 Einträge"-Fall ohne
   künstliche Daten) verifiziert: `"Undatiert (0)"`-Beschriftung vorhanden,
   `textBottom:589.609375 < svgBottom:604.609375` - NICHT abgeschnitten.
   `swimlanes.js` selbst wurde dabei nicht verändert, profitiert
   ausschließlich vom zentralen Fix in `urkundenZeit.js`.
3. **zeitachse.js** (dritte Stichprobe, ergab eine wichtige Erkenntnis statt
   einer einfachen Bestätigung): beim Testen zeigte sich, dass hier GAR
   KEINE "Undatiert"-Beschriftung im DOM existierte (`document.querySelectorAll('svg')`
   → kein Treffer für "Undatiert"-Text). Code-Prüfung ergab die Ursache:
   `zeitachse.js` (Zeile ~845-860) rendert die "Undatiert"-Fläche in einem
   EIGENEN, separaten `<svg>`-Element (`svgUndatiert`) und entfernt dieses
   bei `ohneJahr.length === 0` VOLLSTÄNDIG per `svgUndatiert.remove()` -
   ein eigenständiges, ebenfalls gültiges Absicherungsmuster (kein leerer
   Bereich statt eines zu klein bemessenen). Dieses Modul war vom Bug daher
   NIE betroffen, unabhängig vom zentralen Fix - live bestätigt (nur 1 SVG
   im DOM nach dem Umschalten, keine Konsolenfehler).

Die übrigen sechs Aufrufer (`kalenderHeatmap.js`, `parallelKoordinaten.js`,
`trellis.js`, `horizonChart.js`, `ridgeline.js`, `streamgraph.js`) wurden in
diesem Auftrag NICHT einzeln geprüft (explizites Nicht-Ziel: "keine
Umsetzung der übrigen 8 potenziell betroffenen Urkunden-Module... die
einzelnen Module folgen in eigenen, späteren Aufträgen") - der zuvor
gespawnte Hintergrund-Task für die zentrale Behebung wurde zurückgezogen
(dieser Auftrag deckt sie ab), es wurde bewusst KEIN neuer Ersatz-Task für
die Einzelmodul-Verifikation angelegt, da der Auftraggeber diese explizit
für spätere, eigene Aufträge vorgesehen hat.

### Teil B - permanente Button-Umrandung in zoomSteuerung.js

**Root Cause (kein Logikfehler, ein Kontrastproblem):** die zuletzt
umgesetzte Umrandung war entgegen dem ursprünglichen Plan NIE an
`:hover`/`:focus` gebunden - `.zoom-steuerung { border: 1px solid
var(--border); ... }` galt bereits unbedingt. Das Problem lag in der
FARBWAHL: `--border` (`#ddd8cf`, ein helles Beige) liegt tonal sehr nah an
sowohl `--bg` (`#f7f5f0`, dem Werkzeugleisten-Hintergrund) als auch
`--surface` (`#ffffff`, dem Button-Hintergrund) - der 1px-Rahmen war dadurch
bei normaler Betrachtung praktisch nicht wahrnehmbar, während der
Hover/Fokus-Wechsel auf `--accent` (`#2c4a6e`, dunkles Navy) einen starken,
gut sichtbaren Kontrastsprung erzeugte. Das erklärt die Nutzer-Wahrnehmung
"nur bei Hover/Fokus sichtbar", obwohl es sich rein CSS-technisch nicht um
eine bedingte Regel handelte.

**Fix:** Ruhezustand-Rahmenfarbe auf `var(--text-muted)` (`#595959`)
geändert - ein bereits im Design-System etablierter Grauton für
sekundären, aber klar lesbaren Text (z.B. `ganttDiagramm.js`'
`.gantt-kopf-namensplatzhalter`, `dotPlot.js`s Zeilen-Beschriftungen nutzen
denselben Kontrastanspruch), deutlich höherer Kontrast gegen sowohl `--bg`
als auch `--surface`, bleibt aber bewusst "dezent" (Grauton statt der
kräftigeren Akzentfarbe). Betrifft sowohl den Gruppen-Rahmen
(`.zoom-steuerung`) als auch die Trennlinien zwischen den drei Buttons
(`border-left`, dieselbe Farbe für optische Konsistenz). Hover/Fokus
wechseln unverändert auf `var(--accent)` (per `:has(button:hover)`/
`:has(button:focus-visible)`) - jetzt als zusätzliche Verstärkung bei
Interaktion, nicht mehr als einzige sichtbare Rahmen-Erscheinung.

**Reichweite:** ausschließlich in `js/utils/zoomSteuerung.js` geändert -
gilt automatisch für beide aktuell nutzenden Module (Gantt, Dot Plot) sowie
jedes künftige Modul, das `erzeugeZoomSteuerung()` einbindet. Keine
Einzelanpassung in `ganttDiagramm.js`/`dotPlot.js` nötig oder vorgenommen.

**Visuelle Bestätigung an beiden Modulen (Auftrag, explizit gefordert -
Ruhezustand OHNE Hover/Fokus):**
- **Gantt:** `getComputedStyle(gruppe).borderColor` → `rgb(89, 89, 89)`
  (= `#595959` = `--text-muted`) bei frisch geladener Seite, kein Hover/
  Fokus aktiv. Screenshot bei 1280×720px zeigt den Rahmen deutlich sichtbar
  gegen die helle Werkzeugleiste.
- **Dot Plot:** identisch, `borderColor: rgb(89, 89, 89)` im Ruhezustand.
- **Fokus-Kontrolle (beide Module funktional identisch):** `btn.focus()`
  auf einen Zoom-Button → Gruppen-Rahmen UND Fokus-Outline wechseln auf
  `rgb(44, 74, 110)` (= `--accent`) - Verstärkung bei Interaktion bleibt
  wie zuvor erhalten, nur der Ruhezustand wurde sichtbar gemacht.

### Regressionstest

Testport 9940 (frisch gestartet, ES-Modul-/HTTP-Caching-Vorsicht,
1280×720px). **Dot Plot:** kein abgeschnittener "Undatiert (0)"-Text
(siehe Teil A), Zoom-Buttons weiterhin funktionsfähig
(`scaleBy(1.5)`→`k:1.5`, Reset→`k:1`). **Gantt:** Zoom-Verhalten
unverändert (`scaleBy(1.5)` zweimal→`k:2.25`, Reset→`k:1,x:0,y:0` -
exakt dieselben Werte wie in Eintrag (5) vor diesem Auftrag gemessen),
Sidebar bei Balken-Klick weiterhin funktionsfähig (`offen:true`, Titel
korrekt), Adjazenz Zoom-Steuerung↔Info-Button weiterhin 8px (der
`margin-left:auto`-Fix für den Legenden-Zeilenumbruch aus Eintrag (5)
bleibt unverändert intakt - explizit erneut gemessen, nicht nur
angenommen). Tastaturfokus: `btn.focus()` setzt `document.activeElement`
korrekt, `title`/`aria-label` weiterhin vorhanden und korrekt. In jedem
Testschritt (`read_console_messages` geprüft): keine Konsolenfehler.

**Direkte Dateiverifikation:** `grep -n "MINDEST_HOEHE"
js/viz/dotPlot.js` → genau EIN Treffer, ein Kommentar, der auf den jetzt
zentralen Fix verweist (keine Konstante/aktive Logik mehr - der frühere
`MINDEST_HOEHE_LEERER_UNBEKANNT_BEREICH`-Guard samt Verwendung ist
vollständig entfernt); `grep -n "MINDEST_HOEHE_LEER" js/utils/urkundenZeit.js` → vorhanden
(Konstante + Verwendung in `bereichsHoehe`); `grep -n "text-muted"
js/utils/zoomSteuerung.js` → zwei Treffer (Gruppen-Rahmen +
Button-Trennlinien); `js/viz/ganttDiagramm.js` unverändert (kein Diff zu
Eintrag (5) außer indirekt durch die gemeinsame Komponente).

---

## 2026-09-08 (5) – Dot Plot: Nachbesserungen (Vollbild-Regressionsprüfung, abgeschnittener Text, Zoom-Steuerung ausgelagert, Clip-Path, Sidebar) – teilweise rückwirkend für Gantt

**Betrifft:** geändert `js/viz/dotPlot.js`, `js/viz/ganttDiagramm.js`
(bewusst begrenzt: NUR Zoom-Button-Position/-Optik, siehe Punkt 3 unten -
Zoom-/Pan-LOGIK selbst unverändert, Nicht-Ziel laut Auftrag). Neu:
`js/utils/zoomSteuerung.js` - ab sofort Teil der VORLAGE für die übrigen 25
Urkunden-Module (analog zu `kategorieFarben.js`/`sidebar.js`/
`beschriftung.js`). Kurzfassung in `CHANGELOG.md`. Aufsetzend auf Eintrag (4)
oben - dortige Root-Cause-Befunde zu Vollbild/Info-Button/Zoom-Grundmuster
gelten unverändert fort, hier geht es um NEU aufgetretene bzw. weiterhin
bestehende Probleme nach dem letzten Stand.

### Punkt 1 - Vollbild weiterhin nicht erreicht: Regressionsprüfung

Auftrag verlangte explizit, nicht einfach den alten Fix zu wiederholen,
sondern zu klären, ob zwischen der letzten Verifikation und jetzt eine
Regression eintrat (Verdacht: die neue Zoom-Button-Leiste beansprucht
zusätzlichen vertikalen Platz).

**Vorgehen:** `.viz-inhalt` bei 1280×720px-Viewport (Browser-Tool-Preset
"desktop") per `getBoundingClientRect()` erneut vermessen. **Befund: exakt
503,391px - identisch zum in Eintrag (4) dokumentierten Ausgangswert.** Die
Werkzeugleiste (`.dotplot-werkzeugleiste`) blieb einzeilig bei 44px Höhe in
allen getesteten Breiten (760px, 480px, 1280px) - kein Umbruch, keine
relevante Verdrängung des Plot-Bereichs. **Schlussfolgerung: keine
Regression durch die Zoom-Button-Leiste.** Eine SEKUNDÄRE, nicht abschließend
bestätigte Hypothese wurde zusätzlich geprüft: `overflow:hidden` auf einem
Flex-Item entlang der Hauptachse (`.dotplot-plot-bereich` in
`.dotplot-wurzel{flex-direction:column}`) deaktiviert laut Flexbox-Spezifikation
das automatische `min-height:auto`-Verhalten - könnte bei einer mehrzeilig
umbrechenden Werkzeugleiste den Plot-Bereich verdrängen. In keinem
getesteten Szenario reproduzierbar (Werkzeugleiste blieb stets einzeilig) -
als LATENTES Risiko für künftige, inhaltsreichere Werkzeugleisten
festgehalten, aber nicht die aktive Ursache. Die tatsächliche Wahrnehmung
"nicht vollflächig" erwies sich als Punkt 2 (abgeschnittener Text, siehe
unten) plus das bereits in Eintrag (4) dokumentierte, bewusst
inhaltsgetriebene Höhenverhalten (unverändert - ein Dot Plot mit wenigen
Kategorien füllt die Höhe nicht künstlich aus, dasselbe akzeptierte
Verhalten wie `ganttDiagramm.js`).

### Punkt 2 - Abgeschnittener Text: eigenständige Ursache gefunden

Auftrag verlangte zu klären, ob dies wirklich nur an Punkt 1 hängt oder eine
eigenständige, übersehene Ursache hat.

**Methodischer Hinweis (wichtig für künftige Pixel-Verifikationen):**
Screenshot-Pixelkoordinaten im Browser-Testwerkzeug sind NICHT 1:1 mit den
tatsächlichen CSS-Layout-Pixeln (der Screenshot kann eine skalierte/
komprimierte Voransicht eines größeren tatsächlichen Viewports sein - ein
Screenshot wurde z.B. als ~745×650px angezeigt, während
`window.innerWidth/innerHeight` tatsächlich 1280×720 war). Ab diesem Punkt
ausschließlich `getBoundingClientRect()`/`window.innerWidth/innerHeight` als
Messgrundlage verwendet, nicht Screenshot-Pixel.

**Vorgehen:** jeder Vorfahre der "Undatiert (N)"-`<text>` bis `<html>` per
JS-Skript auf `overflow`/`overflowY` (computed) UND darauf geprüft, ob sein
`getBoundingClientRect().bottom` unterhalb der Textunterkante liegt (was
Verdecken bedeuten würde). **Befund: einzig das `<svg>`-Element selbst
verdeckte den Text** (`rectBottom: 572.609375 < undatiertBottom:
581.609375`, Differenz ≈9px) - `overflow:hidden` ist dessen
UA-Stylesheet-Standardverhalten, KEIN explizit gesetztes CSS. Alle anderen
Vorfahren (`.dotplot-plot-bereich` trotz eigenem `overflow:hidden`,
`.dotplot-wurzel`, `.viz-inhalt`, `main`, `body`, `html`) reichten mit
ihrer Bottom-Kante komfortabel über die Textunterkante hinaus - NICHT die
Ursache.

**Root Cause in `js/utils/urkundenZeit.js`' `zeichneUnbekanntBereich()`**
(Zeilen ~155-164, siehe dortiger Code): bei `eintraege.length === 0` liefert
die Funktion explizit `bereichsHoehe = 0` zurück, zeichnet die
`${beschriftung} (${eintraege.length})`-Beschriftung (`y=16`, `font-size:11`,
`font-weight:bold`) aber UNBEDINGT, unabhängig von `bereichsHoehe`. Der
Aufrufer (`dotPlot.js`) nutzte `bereichsHoehe` zur Berechnung der
SVG-Gesamthöhe (`gesamtHoehe = ohneJahrStart + bereichsHoehe + 10`) - bei 0
undatierten Urkunden endet das SVG dadurch ca. 9-10px VOR der tatsächlichen
Textunterkante (Baseline 16 + Schrift-Unterlänge ≈4px + fehlender
Sicherheitsabstand), das UA-`overflow:hidden` des `<svg>` schneidet sichtbar
ab. **Dieser Bug betrifft potenziell ALLE Aufrufer von
`zeichneUnbekanntBereich()`, die einen leeren "unbekannt"-Bucket haben
können** - laut Dateikopf-Kommentar von `urkundenZeit.js` sind das neben
`dotPlot.js` mindestens `zeitachse.js`, `swimlanes.js`, `streamgraph.js`,
`ridgeline.js`, `horizonChart.js`, `marimekko.js`, `alluvial.js` (8 weitere
Module).

**Fix (bewusst LOKAL in `dotPlot.js`, NICHT in `urkundenZeit.js`):**
`urkundenZeit.js` steht nicht in der "Betroffene Dateien"-Liste dieses
Auftrags. Neue Konstante `MINDEST_HOEHE_LEERER_UNBEKANNT_BEREICH = 24`
(deckt Baseline+Unterlänge mit Sicherheitsabstand ab, dieselbe
Größenordnung wie der von `urkundenZeit.js` selbst verwendete
erste-Kachelzeile-Offset von 24), angewendet als
`bereichsHoehe === 0 ? MINDEST_HOEHE_LEERER_UNBEKANNT_BEREICH : bereichsHoehe`
vor der `gesamtHoehe`-Berechnung. **Nach Fix live verifiziert:**
`svgHeightAttr:394`, `svgBottom:598.609375`, `undatiertTextBottom:583.609375`,
`clipped:false` - Text vollständig sichtbar, ca. 15px Reserve.
**Für künftige Aufträge an den 8 weiteren betroffenen Modulen:** entweder
denselben lokalen Workaround übernehmen, oder in einem eigenen,
dediziertem Auftrag `zeichneUnbekanntBereich()` selbst korrigieren (z.B.
Mindesthöhe direkt dort einbauen) - hier bewusst nicht mitgemacht, um den
Auftragsumfang nicht zu überschreiten; per `spawn_task` als offene Aufgabe
vorgemerkt.

### Punkt 3 - Zoom-Button-Position/-Optik (Dot Plot UND Gantt), ausgelagert nach `js/utils/zoomSteuerung.js`

**Wichtiger Befund vor der Umsetzung:** der Auftragstext beschrieb Gantts
Ist-Zustand als "Zoom-Buttons links neben dem Info-Button". Live vermessen
(Gantt UNVERÄNDERT, vor jeder Änderung dieses Auftrags):
`.gantt-zoom-buttons` bei `left:16, right:156` (oben links), Info-Button-
Wrapper bei `left:1217, right:1249` (oben rechts) - **Abstand 1061px, NICHT
adjazent.** Die Ursache: `.gantt-werkzeugleiste` nutzte
`justify-content:space-between` mit (real, inkl. eines von `infoButton.js`
mit-angehängten `<style>`-Tags) vier Kindern - `space-between` verteilt
Kinder GLEICHMÄSSIG, erzeugt aber keine Adjazenz zwischen zweitem und
letztem Kind. Der Auftragstext beschrieb also fälschlich einen bereits
bestehenden Soll-Zustand als Ist-Zustand - der eigentliche SOLL-Zustand
("links neben dem Info-Button") blieb davon unberührt eindeutig und wurde
für beide Module identisch umgesetzt.

**Umsetzung:** `js/utils/zoomSteuerung.js`, `erzeugeZoomSteuerung(container)` -
baut DOM (drei `<button>`, `title`-Attribut "Verkleinern"/"Zeitachse
zurücksetzen"/"Vergrößern" + passende `aria-label`s) und Optik (Gruppe mit
eigenem Rahmen statt Einzel-Button-Rahmen wie zuvor, `role="group"`), kennt
aber BEWUSST NICHTS über `d3.zoom()` - gibt die drei Button-Elemente
zurück, der Aufrufer hängt die Klick-Listener selbst an (Grund: in beiden
Modulen existiert `zoomVerhalten` erst NACH dem SVG-/Skalen-Aufbau, die
Werkzeugleiste wird aber VOR dem SVG gebaut - identisches Timing-Problem in
beiden Modulen, gelöst durch Rückgabe der Button-Referenzen statt
Callback-Parametern). Rahmen: `.zoom-steuerung{border:1px solid
var(--border); border-radius:var(--radius); overflow:hidden}`,
Trennlinien zwischen Buttons per `border-left`, `:has(button:hover),
:has(button:focus-visible){border-color:var(--accent)}` - Gruppen-Rahmen
nimmt bei Hover/Fokus eines Buttons die Akzentfarbe an (Auftrag wörtlich:
"dezenter grauer Rahmen, der bei Hover/Fokus die Akzentfarbe annimmt").

**Positionierung:** in beiden Modulen ein gemeinsamer rechter Flex-Wrapper
(`.gantt-werkzeugleiste-rechts`/`.dotplot-werkzeugleiste-rechts`,
`display:flex; gap:var(--space-2)`) hält Zoom-Steuerung UND Info-Button als
EIN Werkzeugleisten-Kind - garantiert Adjazenz unabhängig von
`justify-content`/tatsächlicher Kindanzahl (im Unterschied zum vorherigen,
fehlgeschlagenen Ansatz bei Gantt).

**Nachträglich beim Live-Test gefundener und behobener Zwischenfehler:**
nach der Umstellung landeten die Zoom-Buttons bei Gantt weiterhin oben
LINKS statt rechts (Screenshot + Messung). Ursache: `.gantt-legende` nimmt
bei 16 Kategorien die GESAMTE Zeilenbreite ein (sie hat selbst
`flex-wrap:wrap`) und verdrängt den rechten Wrapper per `flex-wrap` der
äußeren Werkzeugleiste auf eine EIGENE zweite Zeile - dort ist er das
EINZIGE Element dieser Zeile, und `justify-content:space-between` platziert
ein einzelnes Element am Zeilenanfang (links), nicht rechts. **Fix:
`margin-left:auto`** auf `.gantt-werkzeugleiste-rechts` UND (aus
Konsistenz-/Robustheitsgründen, auch wenn dort wegen `justify-content:
flex-end` nicht zwingend nötig) `.dotplot-werkzeugleiste-rechts` -
funktioniert unabhängig von Zeilenumbrüchen, da es den gesamten freien
Platz auf der EIGENEN Zeile des Elements links davon konsumiert. Nach Fix
auf frischem Testport (9933, ES-Modul-Caching-Vorsicht) live verifiziert:
Gantt `rechtsRect:{left:1075,right:1249}`, Lücke Zoom→Info: 8px; Dot Plot
weiterhin korrekt rechtsbündig, Lücke 8px.

**Vorher/Nachher-Vergleich Gantt (Auftrag, explizit gefordert - Gantt ist
ein bereits abgeschlossenes, getestetes Modul):** Zoom-Verhalten NICHT über
Screenshot-Vergleich, sondern über den d3-internen `__zoom`-Zustand
verifiziert (aussagekräftiger als Optik): `scaleBy(1.5)` zweimal
hintereinander → `k:1→2.25` (exakt `1.5²`, wie vor der Auslagerung
erwartet), anschließend `transform(zoomIdentity)` → `k:1, x:0, y:0` (voller
Reset). Sidebar-Öffnen per Klick auf einen Balken weiterhin funktionsfähig
(`offen:true`, Titel korrekt "Ingedenkbücher"). Keine Konsolenfehler in
beiden Testrunden. Der Code der eigentlichen `wireZoom()`-Funktion
(`scaleExtent`, `translateExtent`, `.filter()`, `.on('zoom', ...)`) wurde
NICHT angefasst - nur die DOM-Erzeugung/Positionierung der drei Buttons.

### Punkt 4 - Punkte wandern beim Zoom in die Y-Achsen-Beschriftung: clip-path

**Root-Cause-Bestätigung (Auftraggeber-Vermutung war korrekt):** die
Punktgruppe (`svg.append('g').attr('class','dotplot-punkte')`) hatte keinerlei
geometrische Begrenzung - `cx` wird bei jedem `zoom`-Event über
`event.transform.rescaleX(xSkalaBasis)` neu berechnet und kann bei
entsprechendem Pan/Zoom mathematisch beliebig weit unter `RAND.links` (160)
fallen, wodurch der Kreis optisch in die Beschriftungsspalte hineinragt.

**Fix:** `<clipPath id="dotplot-punkte-clip"><rect x="160" y="0"
width="breite-160-20" height="hoehePlot"/></clipPath>`, angewendet als
`clip-path:url(#dotplot-punkte-clip)` auf die gesamte `.dotplot-punkte`-Gruppe.
Rein geometrisch/deklarativ - keine Neuberechnung bei jedem `zoom`-Event
nötig (im Unterschied zu einer denkbaren Alternative, `cx` bei jedem Tick
selbst zu klemmen, was das eigentliche Datum verfälscht hätte statt nur die
Darstellung zu begrenzen).

**Verifikation (zwei unabhängige Nachweise, da der Datensatz keine
Jahreslücke exakt an der Beschriftungsgrenze hat, um den Effekt "natürlich"
zu reproduzieren):**
1. Bei einem reproduzierten Zoom-/Pan-Zustand (Wheel-Zoom mit `ctrlKey`,
   programmatisch am Fixpunkt nahe der linken Kante ausgelöst) existierte
   unter den 1069 Kreisen einer mit `cx=-793.8266...` (laut `d3.zoom()`-
   Transformation korrekt berechnet, weit im Beschriftungsbereich) - der
   `clipPath` (bestätigt `x="160"`) erfasst diesen geometrisch vollständig,
   er wird nicht gerendert.
2. Bei Zoom auf `k=20` (Maximum, `ZOOM_SCALE_EXTENT=[1,20]`), Fixpunkt
   direkt auf der Beschriftungsspalten-Grenze (Zeile "Religion"): von 1069
   Kreisen befanden sich nur 1 im sichtbaren SVG-Viewport-Rechteck, dessen
   `getBoundingClientRect().left` (305px) deutlich RECHTS der
   "Religion"-Beschriftung (`right:168px`) lag - 0 Überlappungen.

Akzeptanzkriterium des Auftrags ("bei keinem Zoom-/Pan-Zustand ragen Punkte
in die Beschriftungsspalte hinein") ist durch die GEOMETRISCHE Natur des
`clip-path`-Fixes für JEDEN möglichen Transform-Zustand erfüllt, nicht nur
für die beiden konkret getesteten.

### Punkt 5 - Sidebar bei Klick auf einen Punkt

**Schema-Diskrepanz erkannt und bewusst gelöst:** `sidebar.js`'
`baueSidebarInhalt()`/`STANDARD_SIDEBAR_FELDER` sind an das Bestand-Schema
gebunden (`zitierweise`, `kurzbeschreibung`, `bkk_unterkategorie` für die
zweite Badge, `record.name`/`kuerzel` für den Titel) - KEINES dieser Felder
existiert auf einem Urkunden-Record (`urkunden.csv`-Header:
`signatur;datum;datum_normiert;datum_unsicher;jahr;orte;orte_unsicher;
regest;personen;personen_id;personen_unsicher;kategorien;
unsicherheit_anmerkung;foto_ordner`). Direkte Wiederverwendung von
`oeffneSidebar()`/`baueSidebarInhalt()` hätte daher eine leere/falsche
Sidebar ("(ohne Name)", keine Felder) produziert. Gelöst nach demselben
Baustein-Prinzip wie `zoomSteuerung.js`: NUR das Gerüst/Öffnen-Schließen-
Verhalten wiederverwendet (`baueSidebarGeruest`/`schliesseSidebar`/
`fuegeSidebarStyleEin`, inkl. derselben CSS-Klassen `bestand-sidebar-*` für
optische Konsistenz), Inhalt lokal in `dotPlot.js` gebaut
(`baueUrkundenSidebarInhalt()`): Badges für ALLE pipe-getrennten Kategorien
aus `record.kategorien` (nicht nur `ersteKategorie()`, Auftrag wörtlich),
Felder Datum/Regest/Personen/Orte, Unsicherheits-Hinweis bei
`datum_unsicher`.

**`signatur` als Toggle-Schlüssel:** gegen `urkunden.csv` per
awk/uniq-Auszählung verifiziert - 1069 Datensätze, 1069 einzigartige
`signatur`-Werte, 0 leere - dieselbe kuerzel-statt-Index-Konvention wie bei
Gantts `schluesselFuerBlatt()` (dort gegen 315 Bestände verifiziert).

**Live verifiziert (an Datensatz StaAKr-0001):** Klick öffnet Sidebar mit
Titel "StaAKr-0001", Badges "Religion" UND "Vermögen und Finanzen" (BEIDE
Kategorien der Urkunde, nicht nur die für die Dot-Plot-Zeile verwendete
Primärkategorie "Religion") - bestätigt die geforderte
Mehrfachkategorie-Anzeige direkt an einem realen Datensatz mit zwei
Kategorien. Erneuter Klick auf denselben Punkt: Sidebar schließt
(`offen:false`), `ausgewaehlt`-Klasse entfernt, Fokus kehrt zum Punkt
zurück (`document.activeElement === circle`). Tastatur-Aktivierung (Enter)
öffnet ebenso. Schließen-Button (×) schließt korrekt, entfernt
`ausgewaehlt`-Markierung.

### Regressionstest

Testports 9931→9932→9933 (jeweils neu gestartet, established: fresh port
pro Testrunde wegen ES-Modul-/HTTP-Caching), Viewport 1280×720
("desktop"-Preset bzw. explizit gesetzt). Gantt: Zoom-Verhalten unverändert
(`__zoom`-Zustand vor/nach identisch zum erwarteten Verhalten), Sidebar
weiterhin funktionsfähig, Info-Button-Popover unverändert erreichbar. Dot
Plot: Vollbild (Höhenwert identisch zu Eintrag (4)), Legende/
Zeilen-Beschriftung unverändert, Zoom/Pan inkl. Clip-Verhalten (siehe
Punkt 4), Sidebar-Toggle inkl. Tastatur/Schließen-Button, Info-Button,
Kategorie-Farben inkl. Mehrfach-Kategorie-Badges in der Sidebar,
Tastaturfokus auf den neu positionierten Buttons (per Tab-Navigation
erreicht, `title`/`aria-label` korrekt, sichtbarer Fokus-Ring im
Screenshot bestätigt), Unsicherheiten-Toggle/Modulwechsel (destroy/
redraw-Zyklus über `select`-`change`-Simulation: `zeitachse`→`dotPlot`),
`window.dispatchEvent(new Event('resize'))`. In JEDEM Testschritt (per
`read_console_messages` geprüft): keine Konsolenfehler.

**Direkte Dateiverifikation:** `grep -n "erzeugeZoomSteuerung"
js/viz/ganttDiagramm.js js/viz/dotPlot.js js/utils/zoomSteuerung.js` → in
allen drei Dateien vorhanden; `grep -n "gantt-zoom-buttons\|
dotplot-zoom-buttons" js/viz/ganttDiagramm.js js/viz/dotPlot.js` → keine
Treffer (alte lokale Zoom-Button-CSS-Klassen vollständig entfernt); `grep
-n "clip-path\|clipPath" js/viz/dotPlot.js` → vorhanden;
`js/utils/urkundenZeit.js` unverändert belassen (kein `MINDEST_HOEHE`-Bezug
dort - der Fix liegt bewusst lokal in `dotPlot.js`, siehe Punkt 2).

---

## 2026-09-08 (4) – Urkunden-Dot-Plot: Vollbild, Info-Button, Kategorie-Farben, Zoom/Pan (VORLAGE FÜR URKUNDEN-MODULE)

**Betrifft:** geändert `js/viz/dotPlot.js` (einzige Datei). Kurzfassung in
`CHANGELOG.md`. **WICHTIG FÜR KÜNFTIGE AUFTRÄGE:** dies ist das ERSTE von 26
Urkunden-Modulen, das auf den bei den 5 Bestand-Modulen etablierten
Funktions-/Qualitätsstand gebracht wurde. Die vier Root-Cause-Befunde in
Schritt 1 gelten strukturell für ALLE 26 Urkunden-Module gleichermaßen
(dieselbe `.viz-inhalt`-Anbindung, derselbe fehlende Info-Button-Import in
jedem noch nicht überarbeiteten Modul, dasselbe potenzielle
Sichtbarkeits-Problem bei knapper Fensterhöhe). Künftige Aufträge für die
übrigen 25 Module SOLLTEN auf diesen Eintrag verweisen statt die Analyse zu
wiederholen - modul-spezifisch bleibt jeweils nur zu prüfen: (a) ob das
konkrete Modul überhaupt eine Zeitachse hat, für die Zoom/Pan sinnvoll ist,
und (b) ob die jeweilige eigene Zeichenfläche (SVG o. Ä.) bereits eine eigene
`<style>`-Injektion hat, die ggf. mit dem Wrapper-Muster kollidieren könnte.

### Schritt 1 - Root-Cause-Analyse (vor jeder Änderung)

**Frage 1 (Vollbild) - die wichtigste Frage dieses Auftrags:** Nutzt das
Urkunden-Modul denselben gemeinsamen Container wie die Bestand-Module, oder
eine eigene Layout-Struktur?

**Befund (Code gelesen: `js/core/app.js`, Zeilen ~140-173/208-239):**
DERSELBE Container. `renderBestandTab()` UND `renderVisualisierungenTab()`
rufen beide identisch `erzeugeUnterContainer('viz-inhalt')` auf und übergeben
das Ergebnis unverändert als `container`-Parameter an `mod.render(container,
...)` - keine separate Struktur für Urkunden-Module. Live vermessen (siehe
unten): `.viz-inhalt` bekommt über das gemeinsame CSS-Grid in
`css/layout.css` (`#app-content{display:grid; grid-template-rows:auto auto
1fr}`, Grid-Items stretchen per CSS-Spezifikation standardmäßig auf ihre
Zeilenhöhe) BEREITS korrekt die volle verfügbare Höhe - bei einem
720px-Viewport wurden `.viz-inhalt` exakt 503,391px zugeteilt (rechnerisch
nachvollzogen: 595,391px `#app-content`-Höhe minus Padding/Row-Gaps minus der
`auto`-Zeilen für Werkzeugleiste/Kleiner-Bildschirm-Hinweis = 503,391px für
die `1fr`-Zeile). **Dies war NIE der eigentliche Fehler und betrifft alle 31
Module gleichermaßen - keine zentrale Nachbesserung an `layout.css` nötig.**

Der TATSÄCHLICHE Fehler: `js/viz/dotPlot.js` hatte in seiner Vorversion GAR
KEINE eigene `<style>`-Injektion und keinen Werkzeugleisten-Wrapper - die
SVG wurde direkt als einziges Kind in `container` (=`.viz-inhalt`) gehängt,
mit einer Höhe, die AUSSCHLIESSLICH aus dem Dateninhalt berechnet wurde
(`gesamtHoehe = Kategorien-Anzahl × Zeilenhöhe + Ränder`), UNABHÄNGIG von der
tatsächlich verfügbaren Höhe. Das Modul versuchte nie, die verfügbare Höhe
zu NUTZEN - weder für eine Werkzeugleiste (existierte nicht) noch strukturell
vorbereitet für eine künftige.

**Vergleich der beiden bereits im Projekt etablierten Lösungsmuster (wichtig
für künftige Module):**
- **treemap.js' Muster** (älter): überschreibt `.viz-inhalt` SELBST per
  lokaler `<style>`-Injektion (`.viz-inhalt{display:flex; flex-direction:
  column; height:100%}`) - funktioniert, ist aber CASCADE-REIHENFOLGE-
  ABHÄNGIG (nur so lange korrekt, wie kein anderes gleichzeitig aktives
  Modul denselben globalen Selektor abweichend definiert - aktuell unkritisch,
  da immer nur ein Modul gleichzeitig rendert und `container.innerHTML`
  vorher geleert wird, aber strukturell fragiler).
  Genutzt von: treemap.js.
- **ganttDiagramm.js' Muster** (neuer, sauberer): erzeugt einen EIGENEN
  Wrapper-Div (`.gantt-wurzel{display:flex; flex-direction:column;
  height:100%}`) als einziges Kind von `container` - bezieht sich korrekt
  auf `.viz-inhalt`s bereits vorhandene, gestreckte Höhe, OHNE den geteilten
  Selektor `.viz-inhalt` selbst anzufassen. Robuster, keine Cascade-
  Abhängigkeit zu anderen Modulen.
  **Empfehlung für alle künftigen Urkunden-Module (hier bereits für
  dotPlot.js umgesetzt): IMMER das ganttDiagramm.js-Muster verwenden, NICHT
  das treemap.js-Muster.** Eine rückwirkende Vereinheitlichung der 5
  Bestand-Module auf das sauberere Muster wäre denkbar, ist aber NICHT Teil
  dieses Auftrags (Nicht-Ziel: keine Änderung an den Bestand-Modulen) - nur
  als Beobachtung dokumentiert.

**Wichtige Nuance, die eine zu wörtliche "Vollbild"-Interpretation
korrigiert:** "Vollbild" bedeutet NICHT, dass jedes Modul seinen Inhalt
künstlich auf Bildschirmgröße strecken muss. `ganttDiagramm.js` selbst
(bereits produktiv, unverändert) streckt seine Zeilen ebenfalls NICHT
künstlich - bei wenigen Beständen bleibt dort ebenfalls Leerraum unterhalb
des Inhalts. "Vollbild" heißt hier: (a) der Container nutzt korrekt die
volle verfügbare Breite/Höhe für seine STRUKTUR (Werkzeugleiste + Plot-
Bereich korrekt positioniert), UND (b) bei zu VIEL Inhalt wächst die SEITE
korrekt (Scroll), statt etwas abzuschneiden. dotPlot.js folgt jetzt exakt
diesem, bereits bei Gantt bewährten Verhalten.

**Frage 2 (Info-Button):** nicht importiert, oder importiert aber falsch
eingebunden?

**Befund:** NICHT importiert (Code gelesen: `js/viz/dotPlot.js`s
Import-Liste enthielt `constants.js`/`tooltip.js`/`urkundenZeit.js`, aber
kein `infoButton.js`) - das Modul entstand vor der Info-Button-Etappe und
wurde seither nie nachgezogen.

**Frage 3 (abgeschnittener Text unten links):** was ist das Element, hängt
es mit dem Vollbild-Problem zusammen?

**Befund:** das Element ist die "Undatiert (N)"-Beschriftung von
`zeichneUnbekanntBereich()` (`js/utils/urkundenZeit.js`, gemeinsam mit 8
weiteren Urkunden-Modulen genutzt, hier UNVERÄNDERT). Live vermessen (vor
dem Fix, Testport 9812): der Text wird an KEINER Stelle per CSS
`overflow:hidden` tatsächlich abgeschnitten - `getComputedStyle(vizInhalt)
.overflow` ergab `"visible"` (bewusst so in `layout.css`, für den
Seiten-Scroll-Fallback bei zu wenig Höhe, siehe dortiger Kommentar). Die
Wahrnehmung "abgeschnitten" entstand dadurch, dass der Text bei knapper
Fensterhöhe schlicht UNTERHALB der sichtbaren Fensterkante lag (Seiten-
Scroll wäre nötig gewesen, aber durch das fehlende, optisch strukturierende
Werkzeugleisten-Layout aus Frage 1 nicht als "hier geht es weiter, bitte
scrollen" erkennbar) - **direkt abhängig von Frage 1, keine eigenständige
Ursache.**

**Frage 4 (Zoom/Pan):** im Code noch vorhanden (nur deaktiviert), oder beim
Neuaufbau nie übernommen?

**Befund:** nie übernommen. `js/viz/dotPlot.js` enthielt keinerlei
`d3.zoom()`-Aufruf, keine Drag-/Wheel-Handler - komplettes Fehlen, nicht
Deaktivierung.

### Schritt 2 - Vollbild (Umsetzung)

`.dotplot-wurzel{display:flex; flex-direction:column; height:100%}` als
einziges Kind von `container`, mit `.dotplot-werkzeugleiste{flex:0 0 auto}`
(natürliche Höhe) und `.dotplot-plot-bereich{flex:1 1 auto; overflow:hidden;
touch-action:pan-y}` (gesamter Rest) als dessen Kinder - exakt
`ganttDiagramm.js`' Struktur (`.gantt-wurzel`/`.gantt-werkzeugleiste`/
`.gantt-zeitbereich`), 1:1 übertragen. `overflow:hidden` auf dem Plot-
Bereich dient (wie bei Gantt) ausschließlich dem HORIZONTALEN Zoom/Pan-
Clipping, nicht vertikaler Begrenzung - vertikal wächst `.dotplot-plot-
bereich` wie sein Vorbild ungehindert mit seinem Inhalt mit (kein
`min-height:0` in der Flex-Kette), wodurch bei zu vielen Zeilen weiterhin
korrekt die SEITE wächst statt etwas abzuschneiden.

**Empfehlung dokumentiert, NICHT umgesetzt (wie vom Auftraggeber verlangt -
nur für Dot Plot umsetzen, Empfehlung nur dokumentieren):** keine zentrale
Änderung an `layout.css`/`app.js` nötig, da `.viz-inhalt` bereits korrekt
funktioniert. Jedes der 25 verbleibenden Urkunden-Module braucht lediglich
denselben modul-lokalen `ganttDiagramm.js`-Wrapper (nicht das ältere
treemap.js-Muster, siehe Schritt 1) - eine zentrale "Lösung" in `layout.css`
wäre nicht zielführend, da die eigentliche fehlende Struktur MODUL-lokal ist
(Werkzeugleiste + Plot-Bereich-Aufteilung), nicht in der gemeinsamen Datei.

### Schritt 3 - Info-Button

Text (dem Auftraggeber zur Prüfung vorgelegt, siehe CHANGELOG für den vollen
Wortlaut) - drei Absätze nach demselben Muster wie `ganttDiagramm.js`'
`GANTT_INFO_TEXT`: (1) was zeigt die Visualisierung (Verteilung über Zeit und
Kategorie, Punktreihe = Kategorie, x-Achse = Jahr, Punktdichte = Häufigkeit),
(2) was bedeuten die beiden "nie stillschweigend ausblenden"-Sonderfälle
((ohne Kategorie)-Zeile, Undatiert-Bereich), (3) wie wird bedient (Zoom/Pan).

### Schritt 4 - Kategorie-Farben (Abgleich, Kernfrage: "Privatvermögen")

**Frage:** Gibt es Kategorienamen in `urkunden.csv`, die in
`kategorieFarben.js` keine Entsprechung haben?

**Befund:** Strukturell UNMÖGLICH, dass eine "fehlende Farbe" auftritt -
`kategorieFarben.js`' `baueKategorieFarbSkala(kategorienNamen)` baut die
Skala DATENGETRIEBEN aus der übergebenen Namensliste (hier: allen
tatsächlich in `urkunden.csv` per `ersteKategorie()` vorkommenden Werten),
im Gegensatz zur alten, STATISCHEN `CAT_COLORS` (`js/config/constants.js`),
bei der ein neuer, nicht hartcodierter Kategoriename tatsächlich auf
`CAT_COLORS.default` (Grau) hätte zurückfallen können. Mit der neuen Lösung
bekommt JEDE tatsächlich vorkommende Kategorie automatisch eine eigene
Farbe, ohne Code-Änderung.

**"Privatvermögen" konkret geprüft (nicht nur behauptet) - live per
`dataLoader.js` gegen alle 1069 Records von `urkunden.csv` verifiziert:**
```
ersteKategorienMitAnzahl: {
  "(ohne Kategorie)": 14, "Bevölkerung": 100, "Bildung und Erziehung": 8,
  "Gesundheit": 7, "Grund und Boden": 2, "Kultur": 5, "Medien": 1,
  "Politik": 331, "Rechtswesen": 258, "Religion": 176, "Soziales Leben": 28,
  "Stadt und Raum": 27, "Verkehr, Ver- und Entsorgung": 1,
  "Vermögen und Finanzen": 95, "Verwaltung": 15, "Wirtschaft": 1
}
nurAlsSekundaerVorkommend: ["Privatvermögen"]
```
"Privatvermögen" kommt in der gesamten CSV NACHWEISLICH nur EINMAL vor
(Datensatz `StaAKr-0192`, Regest vom 1419 VII 24) und dort NUR als
zweite von drei Pipe-getrennten Kategorien: `Grund und
Boden|Privatvermögen|Wirtschaft` (per `grep -n "Privatvermögen"
data/urkunden.csv` bestätigt). `ersteKategorie()` (in `js/utils/
urkundenZeit.js`, UNVERÄNDERT, gemeinsam mit 9 weiteren Modulen genutzt)
liefert per Konvention immer nur die ERSTE der ggf. mehreren Kategorien
eines Records - "Privatvermögen" erscheint deshalb NIE als eigene
Dot-Plot-Zeile, unabhängig vom verwendeten Farbsystem. **Das ist kein
Fehler und keine fehlende Farbzuordnung** - die Farbe FÜR "Privatvermögen"
würde korrekt zugewiesen, sobald irgendein Record es als ERSTE Kategorie
führt; aktuell tut das schlicht keiner. 16 Zeilen im Dot Plot (15 echte
Erst-Kategorien + "(ohne Kategorie)") stimmen exakt mit obiger Tabelle
überein - live per Screenshot UND per DOM-Auszug bestätigt.

`OHNE_KATEGORIE_FARBE` (`#8a8a8a`) wird für die `(ohne Kategorie)`-Zeile
verwendet (14 Records ohne "kategorien"-Feld) - per DOM-Auszug bestätigt,
unterscheidet sich sichtbar von allen 15 echten Kategoriefarben.

### Schritt 5 - Zoom/Pan (Verifikation inkl. bewusst vermiedener Gantt-Fallen)

`wireZoom()` 1:1 aus `ganttDiagramm.js` übernommen (Parameter umbenannt für
Punkte statt Balken/Text, ansonsten identisch):
- **`.transition()` vermieden:** keine einzige Stelle in der gesamten
  Zoom-Kette nutzt `.transition()` - Zoom-Buttons rufen `scaleBy`/`transform`
  direkt auf, exakt wie bei Gantt begründet (rAF-Zuverlässigkeit bei
  inaktivem Tab).
- **`translateExtent()`/`extent()` nicht zu eng:** beide auf `[[0,0],[breite,
  gesamtHoehe]]` gesetzt - die TATSÄCHLICHE volle SVG-Pixelfläche
  (einschließlich Undatiert-Bereich), nicht künstlich verengt.
- **Einfaches Mausrad bleibt frei:** `.filter()` prüft `event.ctrlKey` für
  Wheel-Events - live per synthetischem `WheelEvent` (`ctrlKey:false`)
  bestätigt: `preventDefault()` wird NICHT aufgerufen
  (`defaultNichtVerhindert:true`), Seiten-Scroll bleibt uneingeschränkt
  funktionsfähig.

**Live-Verifikation:**
- Zoom-Button "+": `cx` des ersten Punkts änderte sich (171,392 → -54,912).
- Zoom-Button "⟷" (Reset): stellte exakt den Ausgangswert (171,392) wieder
  her.
- Strg+Wheel (synthetisch, `ctrlKey:true`): `cx` änderte sich (171,392 →
  -214,432).
- Einfaches Wheel (`ctrlKey:false`): `cx` UNVERÄNDERT, `preventDefault()`
  nicht aufgerufen.
- Drag-Pan: **konnte in diesem Testwerkzeug nicht direkt per
  `left_click_drag`/synthetischen Pointer-/Mouse-Events ausgelöst werden -
  identisches Verhalten wurde am UNVERÄNDERTEN, bereits produktiven
  `ganttDiagramm.js` reproduziert** (derselbe `left_click_drag`-Test dort
  bewegte ebenfalls keinen Balken) - damit als Werkzeug-Limitation
  identifiziert, nicht als Fehler in `dotPlot.js`. Indirekt abgesichert über:
  (a) Code-Identität mit `ganttDiagramm.js`' bereits produktiv genutztem,
  funktionierendem Drag-Mechanismus, (b) erfolgreiche Wheel-Zoom-Tests auf
  DERSELBEN `zoomVerhalten`-Instanz (dieselbe `d3.zoom()`-Behaviour-Funktion
  verarbeitet sowohl Wheel- als auch Drag-Ereignisse intern identisch).
- **Nebenbefund (Testartefakt, kein Bug):** eine Serie synthetischer
  `PointerEvent`/`MouseEvent`-Drag-Versuche (mit wiederverwendeter
  `pointerId`) hinterließ einen inkonsistenten internen Zustand, der beim
  nächsten Modulwechsel einen `Uncaught TypeError: Cannot read properties of
  null (reading 'document')` auslöste - reproduziert IDENTISCH am
  unveränderten `ganttDiagramm.js` unter derselben synthetischen
  Event-Sequenz, verschwindet bei jedem sauberen (nicht synthetisch
  manipulierten) Seitenaufruf vollständig. Kein Hinweis auf ein reales
  Nutzerproblem (reale Zeigereingaben erzeugen keine widersprüchliche
  Pointer-Capture-Sequenz).

### Schritt 6 - Abgeschnittener Text (erneute Prüfung nach Schritt 2)

Verschwindet tatsächlich von selbst. Live bei 400×1000px-Viewport (deutlich
unterhalb normaler Fenstergrößen) verifiziert: `.viz-inhalt` fällt korrekt
auf seine `min-height:480px`-Untergrenze zurück, die Seite wächst auf
718px Gesamthöhe (`document.body.scrollHeight`), der "Undatiert
(0)"-Text ist nach vollständigem Scrollen zum Seitenende VOLLSTÄNDIG
innerhalb des Viewports sichtbar (`vollstaendigSichtbar:true`, exakter
Bounding-Box-Vergleich gegen `window.innerHeight`) - kein Abschneiden zu
keinem Zeitpunkt, nur normales, jetzt durch die klare Werkzeugleisten-
Struktur besser nachvollziehbares Seiten-Scrollen.

### Regressionstest (Testport 9826, danach zurückgesetzt)

Treemap (Bestand-Modul) live geöffnet, unverändert, keine Konsolenfehler -
`grep` nach `dotplot`/`dotPlot` in allen 5 Bestand-Modul-Dateien bestätigt
zusätzlich 0 Treffer (keine versehentliche Kopplung). Info-Button-Text
korrekt angezeigt. Kategorie-Farben inkl. Randfall aus Schritt 4 bestätigt.
Zoom/Pan (Buttons, Strg+Wheel, Kantenklemmen über `translateExtent`) live
bestätigt. Tooltip/Hover: bereits VOR diesem Auftrag vorhanden
(`wireTooltip()`, unverändert übernommen) - live erneut bestätigt
funktionsfähig (`"StaAKr-0001\n1108 IX 6\nReligion"`), **kein Folgeauftrag
nötig, da bereits vollständig funktional.** Resize
(`window.dispatchEvent(new Event('resize'))`) ohne Fehler. Modulwechsel weg
(Treemap) und zurück (destroy()/render()-Zyklus) sauber, kein Zustand
"hängen geblieben". Tastaturfokus: eigener Fokus-Indikator
(`.urkunde-punkt:focus{outline:none; stroke:var(--accent)}`, da der
browserseitige rechteckige Standard-Outline auf einem 3,5px-Kreis zwar
weniger störend als bei größeren Bogen-Segmenten wäre, aber zur
Konsistenz mit den bereits etablierten Fokus-Indikator-Konventionen trotzdem
ergänzt) - live per `getComputedStyle()` bestätigt (`outlineStyle:"none"`,
`stroke:"rgb(44, 74, 110)"`). Keine Konsolenfehler in jedem regulären
(nicht synthetisch-drag-manipulierten) Testschritt.

---

## 2026-09-08 (3) – Bugfix: Falsche Kategorie im Tooltip in Zoomansichten (kategorieVonKnoten)

**Betrifft:** geändert `js/utils/bestandsHierarchie.js`, `js/viz/circlePacking.js`.
Kurzfassung in `CHANGELOG.md`. Vorgeschichte: Bug erstmals live bei Circle
Packing entdeckt während des Sunburst-3-Ebenen-Auftrags, per spawn_task als
eigene Aufgabe vorgeschlagen; der Auftraggeber hat den Root-Cause-Befund nach
einer konkreten, ground-truth-verifizierten Reproduktion (Bestand
"Steuerbücher", exakter Tooltip-Text vs. CSV-Zeile 301) akzeptiert und um die
eigentliche Behebung gebeten - mit einer expliziten Vorgabe zur Lösungsrichtung
(siehe Schritt 1) und einer expliziten Prüfpflicht für Treemap/Icicle (siehe
Schritt 2).

### Schritt 1 - Lösungsrichtung (vom Auftraggeber vorgegeben, nicht selbst
gewählt)

**Ausdrückliche Vorgabe:** NICHT den Depth-Wert in `kategorieVonKnoten()`
einfach von 1 auf 0 ändern - das hätte denselben Fehler nur umgekehrt
reproduziert (in der NICHT-Zoom-Ansicht, wo Tiefe 1 tatsächlich die Kategorie
ist, wäre dann fälschlich der Gesamtbestand-Wurzelknoten oder gar nichts
gefunden worden). Stattdessen: eine tiefenUNABHÄNGIGE Kategorie-Erkennung.

**Umsetzung:** `baueBestandsHierarchie()` vergibt jetzt an jeden erzeugten
Knoten ein stabiles `ebenenTyp`-Attribut (`'kategorie'`, `'unterkategorie'`
oder `'bestand'`, als exportierte Konstanten `EBENENTYP_KATEGORIE`/
`EBENENTYP_UNTERKATEGORIE`/`EBENENTYP_BESTAND` - Export bewusst, damit ein
Modul, das eine eigene Teilhierarchie lokal neu zusammensetzt, denselben
Wert statt eines eigenen String-Literals verwendet, siehe Schritt 2/Circle
Packing). `kategorieVonKnoten(d)` sucht jetzt über `d.ancestors()` (schließt
`d` selbst ein, für den Fall, dass direkt ein Kategorie-Knoten übergeben
wird) nach dem ersten Vorfahren mit `ebenenTyp === EBENENTYP_KATEGORIE` -
diese Suche liefert dasselbe Ergebnis, EGAL ob die Hierarchie ab
Gesamtbestand (0=Gesamtbestand, 1=Kategorie, 2=Unterkategorie, 3=Bestand)
oder ab einer bereits gezoomten Kategorie (0=Kategorie, 1=Unterkategorie,
2=Bestand, oder bei Circle Packings flacher Variante sogar 0=Kategorie,
1=Bestand) aufgebaut wurde - das Attribut wandert mit dem jeweiligen
Kategorie-DATENOBJEKT selbst mit (dasselbe `.data`-Objekt wird beim Zoomen
unverändert weiterverwendet, `wechsleZuKategorie(kategorieDaten)` erhält es
direkt vom Klick-Handler), unabhängig davon, an welcher Tiefe es in der
jeweils aktuell aufgebauten `d3.hierarchy()`-Instanz landet.

Als defensiver Nebeneffekt: `kategorieVonKnoten()` wirft nicht mehr (per
`.find(...).data.name` auf `undefined`), falls wider Erwarten kein
Kategorie-Vorfahre gefunden wird, sondern fällt auf `d.data.name` selbst
zurück - reine Absicherung, im Normalfall nie erreicht.

### Schritt 2 - Systematische Prüfung aller fünf Module (nicht nur vermutet)

**Vorgehen:** für jedes der fünf Module (die laut `bestandsHierarchie.js`s
eigenem Regressionsschutz-Kommentar `baueBestandsHierarchie()` nutzen) wurde
der Code der jeweiligen Kategorie-Zoom-Funktion gelesen und geprüft, WOMIT
genau `d3.hierarchy(...)` beim Zoom aufgerufen wird:

- **`sunburst.js`** (Zeile ~569): `anzeigeDaten = aktuelleKategorieDaten ||
  hierarchieDaten; wurzel = d3.hierarchy(anzeigeDaten)` - re-verwurzelt bei
  Zoom auf die Kategorie selbst. **Bestätigt betroffen** (bereits vor diesem
  Auftrag per Nutzer-Report reproduziert).
- **`circlePacking.js`** (Zeile ~279, über `baueFlacheBestaende()`): baut bei
  Zoom eine noch FLACHERE Teilhierarchie (`{name: kategorieName, children:
  voll.leaves().map(b => b.data)}` - Bestand-Blätter DIREKT unter der
  Kategorie, keine Unterkategorie-Zwischenebene). **Bestätigt betroffen**
  (ebenfalls bereits vor diesem Auftrag reproduziert) - UND zusätzlich Quelle
  des in Schritt 4 beschriebenen Folgefehlers (siehe dort), gerade WEIL hier
  keine Unterkategorie-Ebene existiert.
- **`icicle.js`** (Zeile ~319): `anzeigeDaten = aktuelleKategorieDaten ||
  hierarchieDaten; wurzel = d3.hierarchy(anzeigeDaten)` - IDENTISCHES Muster
  zu `sunburst.js`, Zeile für Zeile. **GEGENGEPRÜFT statt nur vermutet:** vor
  dem Fix live reproduziert (Klickpfad: Icicle → Klick auf Kategorie-Zeile
  "Vermögen und Finanzen" → Hover über Bestand-Kachel "Steuerbücher" in der
  Bestand-Zeile der Kategorie-Ansicht) - Tooltip zeigte vor dem Fix ebenfalls
  fälschlich "Kategorie: Öffentliches Vermögen" statt "Vermögen und
  Finanzen". Nach dem Fix korrekt.
- **`treemap.js`** (Zeile ~639): `anzeigeDaten = aktuelleKategorieDaten ||
  hierarchieDaten; wurzel = d3.hierarchy(anzeigeDaten)` - ebenfalls
  identisches Muster. **GEGENGEPRÜFT statt nur vermutet:** vor dem Fix live
  reproduziert (Klickpfad: Treemap → Klick auf Kategorie-Kachel "Vermögen und
  Finanzen" in der Wurzel-Ansicht → Hover über Bestand-Kachel "Steuerbücher"
  in der Kategorie-Ansicht) - derselbe Fehler wie bei Icicle/Sunburst
  bestätigt. Nach dem Fix korrekt.

  Wichtige Nuance bei `treemap.js`: NUR die Kategorie-Ansicht
  (`wireKategorieKachelInteraktion()`, nutzt `baueTooltipText()`
  unconditional) ist betroffen - die Wurzel-Ansicht selbst zeigt gar keinen
  "Kategorie: ..."-Tooltip (dort nur ein einfacher Namens-Tooltip als
  Label-Ersatz, `wireVerzoegerterTooltip(gruppe, knoten.data.name, ...)`,
  siehe Auftrag "Beschriftungs-Kürzung mit Ellipse"), war also strukturell
  nie vom `kategorieVonKnoten()`-Fehler betroffen.
- **`ganttDiagramm.js`** (Zeile ~772): einzige `d3.hierarchy(...)`-Stelle im
  gesamten Modul ist `d3.hierarchy(hierarchieDaten).leaves()` - IMMER die
  volle, ab Gesamtbestand aufgebaute Hierarchie, KEIN Zoom-in-Kategorie-
  Muster (Gantt zeigt alle Bestände gleichzeitig, ohne Drill-down). **Nie
  betroffen** - live bestätigt (Bestand "Steuerbücher" zeigte vor UND nach
  dem Fix korrekt "Kategorie: Vermögen und Finanzen").

### Schritt 3 - Umsetzung in circlePacking.js

`baueFlacheBestaende()` gibt dem manuell konstruierten `flacheDaten`-
Wurzelobjekt jetzt explizit `ebenenTyp: EBENENTYP_KATEGORIE` mit (importiert
aus `bestandsHierarchie.js`, keine lokale String-Kopie) - die
Bestand-Blätter selbst brauchten KEINE Anpassung, da `voll.leaves().map(b =>
b.data)` dieselben `.data`-Objekte weiterreicht, die bereits in
`baueBestandsHierarchie()` mit `ebenenTyp: EBENENTYP_BESTAND` versehen
wurden (keine Kopie, dieselbe Objektreferenz).

### Schritt 4 - Zusätzlicher Folgefehler (beim Live-Verifizieren entdeckt,
nicht Teil des ursprünglichen Reports)

Nach dem Fix von `kategorieVonKnoten()` zeigte Circle Packings Zoomansicht
für "Steuerbücher" testweise: `"Kategorie: Vermögen und Finanzen"` (jetzt
korrekt) ABER `"Unterkategorie: Vermögen und Finanzen"` (identisch mit der
Kategorie-Zeile, statt "Öffentliches Vermögen"). Ursache:
`baueTooltipText()`s Unterkategorie-Zeile prüfte bislang nur `blatt.parent &&
blatt.parent.data.name !== OHNE_UNTERKATEGORIE`, ohne zu verifizieren, dass
`blatt.parent` tatsächlich eine Unterkategorie IST - in Circle Packings
flacher Zoom-Struktur ist `blatt.parent` aber die KATEGORIE selbst (keine
Unterkategorie-Zwischenebene vorhanden). Dieser Fehler existierte bereits VOR
diesem Auftrag (unverändert durch den obigen `kategorieVonKnoten()`-Fix), war
aber bislang von der GLEICHZEITIG falschen Kategorie-Zeile "verdeckt" (beide
Zeilen zeigten vorher unterschiedliche falsche Werte, die Duplikation fiel
nicht auf).

**Fix:** die Bedingung prüft jetzt zusätzlich `blatt.parent.data.ebenenTyp
=== EBENENTYP_UNTERKATEGORIE`. Fehlt die Unterkategorie-Zwischenebene (wie
bei Circle Packings Zoomansicht), entfällt die Zeile jetzt VOLLSTÄNDIG,
statt einen falschen (weil duplizierten) Wert zu zeigen - dieselbe "lieber
weglassen als falsch anzeigen"-Konvention, die für den `OHNE_UNTERKATEGORIE`-
Fall direkt daneben bereits galt. Bewusst KEINE aufwendigere Lösung (z.B.
`blatt.data.record.bkk_unterkategorie` als CSV-Spalten-Fallback direkt
auslesen) - hätte `baueTooltipText()` unnötig an die konkrete
Spaltenbenennung gekoppelt, für eine einzige, seltene Rand-Situation (flache
Zoom-Struktur nur in Circle Packing) nicht gerechtfertigt.

### Live-Verifikation (Testport 9694, danach zurückgesetzt) - Akzeptanzkriterium

Drei Bestände mit unterschiedlichen Kategorie/Unterkategorie-Paaren, jeweils
per `document.getElementById('geteilter-tooltip').textContent`-Auszug
geprüft (nicht nur Screenshot):

| Bestand | Sunburst | Circle Packing | Treemap (Zoom) | Icicle | Gantt |
|---|---|---|---|---|---|
| Steuerbücher → Vermögen und Finanzen / Öffentliches Vermögen | ✓ (Übersicht+Zoom) | ✓ (Übersicht+Zoom) | ✓ | ✓ (Übersicht+Zoom) | ✓ |
| Sparkasse Krems → Wirtschaft / Dienstleistungen | ✓ | ✓ | ✓ | ✓ | (nicht separat geprüft) |
| Bürgerbücher → Verwaltung / Kommunale Verwaltung | ✓ | ✓ | ✓ | ✓ | (nicht separat geprüft) |

Alle geprüften Tooltips exakt mit `data/bestandsverzeichnis.csv` abgeglichen.
Circle Packing zusätzlich bestätigt: Unterkategorie-Zeile entfällt jetzt
korrekt (statt Duplikat) in der Zoomansicht; Sunburst/Icicle/Treemap zeigen
die Unterkategorie-Zeile weiterhin korrekt (kein Regressions-Verlust dort).
Keine Konsolenfehler in jedem der ca. 15 Einzeltests. Jeweils frischer Port
pro Testrunde verwendet (Cache-Vorsichtsmaßnahme, siehe etablierte
Projekt-Konvention).

### Direkte Dateiverifikation

`grep -n "EBENENTYP_\|ebenenTyp" js/utils/bestandsHierarchie.js` → Konstanten,
Vergabe in `baueBestandsHierarchie()`, Nutzung in `kategorieVonKnoten()`/
`baueKnotenTooltipText()`/`baueTooltipText()` bestätigt; `grep -n
"EBENENTYP_KATEGORIE\|ebenenTyp" js/viz/circlePacking.js` → Import und
Vergabe an `flacheDaten` bestätigt; kein aktiver Code mehr, der auf `d.depth
=== 1` prüft (nur noch erklärende Kommentare); `grep -rn "DIAG\|TEMPORAERER"
js/` → keine Treffer.

---

## 2026-09-08 (2) – Beschriftungs-Kürzung mit Ellipse – gemeinsame Utility für 4 Module

**Betrifft:** neu `js/utils/beschriftung.js`; geändert `js/viz/treemap.js`,
`js/viz/sunburst.js`, `js/viz/icicle.js`, `js/viz/circlePacking.js`.
`js/viz/ganttDiagramm.js` bewusst NICHT umgestellt (Nicht-Ziel). Kurzfassung
in `CHANGELOG.md`.

### Schritt 1 - Root-Cause-Check

**Frage:** Ist die "Name only, sonst kein Text"-Logik in allen vier Modulen
identisch implementiert (dupliziert), oder gibt es bereits eine gemeinsame
Stelle?

**Befund (aktiv geprüft, alle vier Dateien gelesen):** Weder-noch. Es lag
keine 1:1-Duplikation vor - jedes Modul hatte sein eigenes,
geometrieabhängiges "größte passende Schriftgröße suchen"-Verfahren, und die
vier unterschieden sich strukturell deutlich voneinander:

- `treemap.js`s `platziereAutoFitText()`: MEHRZEILIG mit Wortumbruch ohne
  Silbentrennung (`zeileUmbrechenOhneSilbentrennung()`), prüft pro
  Schriftgröße, ob ALLE umgebrochenen Zeilen sowohl in die verfügbare Breite
  als auch in die verfügbare Zeilenanzahl passen.
- `sunburst.js`s `fuegeSegmentBeschriftungEin()`: einzeilig, Text läuft
  radial vom inneren zum äußeren Rand eines Bogensegments; verfügbare Breite
  ist die radiale Ringdicke, zusätzlich eine Bogenlängen-Bedingung (reicht
  die Winkelspanne bei dieser Schriftgröße für eine Zeile Texthöhe).
- `icicle.js`s `platziereBeschriftung()`: einzeilig, simpelste der vier
  Varianten (Rechteck, keine Umbruch-, keine Bogenlängen-Logik).
- `circlePacking.js`: KEINE eigene Funktion - eine Inline-`for`-Schleife
  direkt in der Zeichenroutine, mit einer eigenen
  Kreis-Sehnenbreiten-Formel (`2·√(r² − (Schriftgröße·0,7)²)`), die die
  verfügbare Breite abhängig von Radius UND Schriftgröße berechnet.

**Extrahierbar war ausschließlich der letzte, in allen vieren GLEICHE
Schritt:** eine bereits vom Aufrufer geometrieabhängig berechnete verfügbare
Breite gegen `Text.length × (Schriftgröße × 0,57)` prüfen. Diese "passt/passt
nicht"-Formel selbst war in allen vier Modulen bereits identisch (dieselbe
0,57-Heuristik), nur die BERECHNUNG der verfügbaren Breite unterschied sich
je Geometrie. Genau diese gemeinsame Formel - jetzt erweitert um die
Kürzungs-Fallback-Stufe - wandert nach `js/utils/beschriftung.js`; alles
Geometrische (Wortumbruch, Bogenlänge, Kreis-Sehne) bleibt bewusst
modul-lokal (Nicht-Ziel: keine Änderung an der Skalierungslogik der vier
Module).

### Schritt 2 - Neue gemeinsame Funktion

`ermittleBeschriftungstext(name, verfuegbareBreite, schriftgroesse,
zeichenBreiteFaktor = 0,57)`: berechnet `maxZeichen =
Math.floor(verfuegbareBreite / (schriftgroesse × zeichenBreiteFaktor))`. Passt
`name.length` darunter, wird `name` unverändert zurückgegeben. Reicht das
nicht, aber `maxZeichen >= 4` (mindestens 3 echte Zeichen + "…" = 4 sichtbare
Zeichen, Auftrag wörtlich), wird `name.slice(0, maxZeichen - 1) + '…'`
zurückgegeben. Sonst `null`. Kennt selbst weder Rechteck noch Bogen noch
Kreis - nur Text und eine bereits fertig berechnete Zahl (Auftrag wörtlich:
"nur Text und verfügbaren Raum ... entgegennehmen, keine modul-spezifischen
Annahmen treffen"), dieselbe Trennung "geteilte Formel, modul-lokales
Zeichnen" wie bei `kategorieFarben.js`/`sidebar.js`.

**Integrationsentscheidung (nicht explizit im Auftrag vorgegeben, aber für
eine korrekte Umsetzung nötig):** die Funktion wird NICHT anstelle der
bestehenden Schriftgrößen-Suche jedes Moduls aufgerufen, sondern erst DANACH,
als einmaliger Fallback bei der etablierten Mindestschriftgröße, wenn diese
Suche bei JEDER erlaubten Schriftgröße für den VOLLEN Namen gescheitert ist.
Begründung: (a) entspricht der Auftragsformulierung wörtlich ("bei der
etablierten Mindestschriftgröße" als Bedingung für den Kürzungs-Fall); (b)
eine kleinere Schriftgröße lässt mehr Zeichen in denselben Pixel-Raum passen
- die Mindestschriftgröße gibt der Kürzung die größtmögliche Chance,
überhaupt zu greifen; (c) die bestehende, bereits korrekte
Schriftgrößen-Suche bleibt dadurch UNVERÄNDERT (Nicht-Ziel: "keine Änderung
an der Mindestschriftgröße selbst"), minimiert das Regressionsrisiko
gegenüber einer Variante, die die neue Funktion in JEDEM Schleifendurchlauf
aufgerufen hätte.

### Schritt 3 - Integration in die vier Module (Vorher/Nachher explizit
geprüft)

- **`treemap.js`:** `platziereAutoFitText()` gibt jetzt einen Tri-State
  zurück (`'voll' | 'gekuerzt' | false` statt `true`/`false`) - der einzige
  bestehende Aufrufer, der den Rückgabewert als reinen Wahrheitswert nutzt
  (`zeichneKategorieAnsicht()`), funktioniert dadurch unverändert weiter
  ('voll'/'gekuerzt' sind beide truthy). `zeichneEineWurzelKachel()` nutzt
  die genauere Unterscheidung: der Tooltip-Ersatz (`wireVerzoegerterTooltip()`)
  wird jetzt bei `!== 'voll'` gewirt statt nur bei `!beschriftet` - vorher
  bekamen NUR komplett unbeschriftete Kacheln einen Ersatz-Tooltip, jetzt
  auch gekürzt beschriftete (Auftrag Schritt 3, wörtlich: "Tooltip zeigt
  weiterhin den vollständigen Namen" auch bei gekürzter Anzeige). Kacheln mit
  vollständig sichtbarem Namen ('voll') bleiben wie zuvor ohne zusätzlichen
  Tooltip (unverändert, kein Regressions-Risiko).
- **`sunburst.js`:** ebenfalls Tri-State-Rückgabe. Die Kategorie-Ring-
  Tooltip-Fallback-Logik (`beschriftet ? kategorieName : ...`) wurde auf
  `beschriftet === 'voll'` verschärft - bei `'gekuerzt'` zeigt der Tooltip
  jetzt die ausführlichere Variante mit Bestände-Zahl statt nur des (dann
  nicht mehr vollständig sichtbaren) Namens. Die radiale Positionsberechnung
  für gespiegelten (untere Kreishälfte) Text musste auf die Länge des
  TATSÄCHLICH angezeigten (ggf. gekürzten) Texts umgestellt werden, nicht
  mehr auf `text.length` des vollen Namens - sonst wäre die
  Spiegel-Translation für gekürzten Text falsch positioniert gewesen (live
  geprüft: kein sichtbarer Versatz).
- **`icicle.js`/`circlePacking.js`:** einfaches `true`/`false` (bzw. bei
  circlePacking: kein Rückgabewert nötig, da Inline-Block) - beide wiren den
  Tooltip bereits UNCONDITIONAL für jedes Segment (unabhängig vom
  Label-Status), Schritt 3s Tooltip-Anforderung war hier bereits vor diesem
  Auftrag erfüllt, keine Anpassung an der Tooltip-Wiring-Logik nötig.

**Vorher/Nachher-Prüfung (Auftrag ausdrücklich verlangt):** für alle vier
Module verifiziert, dass (a) Elemente, die vorher den vollen Namen zeigten,
dies weiterhin tun (kein Element mit `maxZeichen >= name.length` bei der
zuerst gefundenen passenden Schriftgröße wird jetzt unnötig gekürzt - die
bestehende Suche nach der GRÖSSTEN passenden Schriftgröße läuft unverändert
zuerst und hat bei Erfolg immer Vorrang vor der neuen Kürzungs-Stufe, die nur
bei vollständigem Scheitern dieser Suche überhaupt erreicht wird), und (b)
Elemente, die vorher gar keinen Text zeigten, jetzt korrekt auf eine
3-Zeichen-Kürzung geprüft werden (live an mehreren Beispielen je Modul
bestätigt, siehe Schritt 4).

### Schritt 4 - Verifikation an echten Daten (Testport 9467, danach
zurückgesetzt)

**Beispiel 1 (vorher kein Label, jetzt gekürzt):** Treemap-Wurzel-Ansicht,
Bestand "Kammeramtsrechnungen" (20 Zeichen, ein einzelnes nicht trennbares
Wort) in einer 93×61px-Kachel. Vorher: `zeileUmbrechenOhneSilbentrennung()`
kann ein 20-Zeichen-Wort bei keiner Zeilenbreite (max. 13 Zeichen bei
11px/93px) in eine gültige Zeile packen, egal wie viele Zeilen erlaubt sind
- kein Label. Jetzt: `ermittleBeschriftungstext('Kammeramtsrechnungen', 83,
11)` → `maxZeichen = floor(83/6,27) = 13` → `'Kammeramtsre…'` (13 Zeichen
inkl. Auslassungspunkt) wird gezeichnet. Per `getComputedStyle`/DOM-Auszug
bestätigt: `font-size: 11`, Tooltip (`wireVerzoegerterTooltip`, jetzt korrekt
gewirt da Ergebnis `'gekuerzt'` ≠ `'voll'`) zeigt weiterhin
`"Kammeramtsrechnungen"` vollständig.

**Beispiel 2 (sehr kleines Element, selbst Kürzung passt nicht):**
Treemap-Wurzel-Ansicht, Bestand "Oberkammeramts-Rechnungssammler" (32
Zeichen) in einer 34×56px-Kachel. `ermittleBeschriftungstext(...,
verfuegbareBreite=24, 11)` → `maxZeichen = floor(24/6,27) = 3` → `3 < 4` →
`null` → kein Text gezeichnet (per DOM-Auszug bestätigt: kein `<text>`-Kind
in dieser Kachel-Gruppe). Tooltip bleibt einziger Zugang zum Namen
(unverändert, da `'voll'` nie erreicht wurde).

**Weitere Module (ergänzend, nicht nur behauptet):** Sunburst zeigt
"Öffentliches Vermögen" → "Öffentliches …" im Unterkategorie-Ring der
Zoomansicht, während "Privatvermögen"/"Steuerbücher" bei ausreichend Platz
unverändert vollständig sichtbar bleiben (13 von 19 sichtbaren Labels in
diesem Zustand gekürzt, 6 voll - beide Fälle nebeneinander bestätigt, keine
pauschale Über-Kürzung). Icicle und Circle Packing zeigen jeweils mehrere
gekürzte Labels bei laufendem Betrieb; Circle Packing zusätzlich per
`getElementById('geteilter-tooltip')`-Auszug bestätigt: Tooltip-Text für die
gekürzt angezeigte Kachel "Kammeram…" lautet vollständig
`"Kammeramtsrechnungen\n..."`.

### Regressionstest

Treemap/Sunburst/Icicle/Circle Packing: Beschriftung bei großen (voller
Name), mittleren (gekürzt) und sehr kleinen (kein Text) Elementen live
geprüft; Tooltip-Verhalten in allen Fällen bestätigt (voller Name auch bei
Kürzung erreichbar); Sidebar-Klick (Circle Packing, öffnet Detailansicht),
Fokus-Indikator, Farbcodierung, Zoom-Verhalten (alle vier Module) unverändert;
Resize (`window.dispatchEvent(new Event('resize'))`) ohne Fehler.
Gantt-Diagramm live geöffnet: eigene Namensspalten-Kürzung weiterhin aktiv
und unverändert (z. B. "Stiftsakten der Allerheiligen- und …"), `grep` nach
`ermittleBeschriftungstext`/`utils/beschriftung` in `ganttDiagramm.js` →
keine Treffer, also keine versehentliche Umstellung. Keine Konsolenfehler in
jedem einzelnen Testschritt über alle fünf Module hinweg.

**Nebenbeobachtung (kein neuer Fund, nur zusätzliche Bestätigung eines
bereits gemeldeten Bugs):** beim Circle-Packing-Tooltip-Test wurde erneut der
in Eintrag "2026-09-08 (1)" dokumentierte, bereits als separate Aufgabe
vorgeschlagene `kategorieVonKnoten()`-Fehler beobachtet (Tooltip zeigte
"Kategorie: Kammeramtsrechnungen" statt der echten Kategorie) - bestätigt,
dass dieser Fehler nicht sunburst.js-spezifisch ist, sondern auch
circlePacking.js betrifft (beide nutzen denselben `bestandsHierarchie.js`-
Code-Pfad in ihrer jeweiligen Zoomansicht). Kein neues Ticket nötig, das
bestehende deckt beide Module bereits ab.

---

## 2026-09-08 (1) – Sunburst: Rückkehr zur 3-Ebenen-Ansicht

**Betrifft:** geändert `js/viz/sunburst.js` (einzige Datei). Kurzfassung in
`CHANGELOG.md`.

### Schritt 1 - Root-Cause-Check (vor der Umsetzung, wie explizit gefordert)

**Frage 1:** Nutzt `sunburst.js` aktuell dieselbe Datenquelle wie `icicle.js`?

**Befund:** Ja, unverändert - beide importieren `baueBestandsHierarchie` aus
`js/utils/bestandsHierarchie.js`, ohne diese Datei zu verändern (Nicht-Ziel).
`bestandsHierarchie.js` liefert seit der Icicle-Etappe bereits die volle
4-Ebenen-Struktur (Gesamtbestand → Kategorie → Unterkategorie → Bestand) -
keine Anpassung dort nötig.

**Frage 2:** Ist `MINDESTGROESSE_ROH_SUNBURST` (bereits 0,05) nach Ergänzung
der dritten Ebene weiterhin korrekt gesetzt?

**Befund (aktiv geprüft, nicht erst zufällig entdeckt - dieser Fehler war
bereits dreimal aufgetreten: Treemap, Sunburst ursprünglich, Icicle/Circle
Packing):** Ja, weiterhin korrekt. `mindestgroesse` wirkt in
`baueBestandsHierarchie()` als `Math.max(parseUmfangLfm(record.umfang_lfm),
mindestgroesse)` - ein Floor, der GENAU EINMAL pro Bestand-Record an der
BLATT-Ebene angewendet wird, beim Aufbau der Datenstruktur selbst. Wie viele
Ebenen DAVON später tatsächlich als Ring gezeichnet werden, ist eine reine
Darstellungsentscheidung in `zeichneSunburst()` (welche Tiefen als Ring
gerendert werden) - diese Entscheidung liegt zeitlich UND strukturell nach
der Wertberechnung und kann sie nicht rückwirkend beeinflussen. Zusätzlich
bereits empirisch abgesichert: `icicle.js` verwendet exakt denselben Wert
(`MINDESTGROESSE_ROH_ICICLE = 0.05`) für eine bereits produktiv 3-ebenige
Darstellung (Kategorie-/Unterkategorie-/Bestand-Zeile gleichzeitig sichtbar,
siehe dortiger Dateikopf-Kommentar) - derselbe Parameter, dieselbe
Datengrundlage, bereits gegen drei Ebenen verifiziert im Einsatz.

**Ergebnis:** keine Änderung an `MINDESTGROESSE_ROH_SUNBURST` oder
`bestandsHierarchie.js` nötig.

### Schritt 2 - Drei konzentrische Ringe (Übersicht)

Jeder Ring bekommt eine eigene, gleich breite Radius-Bande über
`[INNERER_RADIUS, aussenRadius]` (`bandFuerRing()`). Die Mindest-Bogenlänge
(24px) wird jetzt PRO RING aus dessen EIGENEM Außenradius berechnet
(`mindestWinkelFuerBand()`) statt aus dem einen globalen Außenradius wie in
der vorigen 2-Ebenen-Fassung - notwendig, weil ein weiter innen liegender
Ring bei identischem Winkel eine kürzere tatsächliche Bogenlänge hat und
sonst systematisch unter die 24px-Zielgröße fiele.

Die winkel-Aufteilung (`x0`/`x1`) für alle drei Ebenen kommt weiterhin aus
EINEM `d3.partition()`-Aufruf auf der vollen Hierarchie - dieselbe Erkenntnis
wie bei der ursprünglichen Sunburst-Etappe: Summen/Anteile bleiben über
Zwischenebenen hinweg proportional korrekt, keine manuelle Neuzuordnung
nötig. Für die Mindestwinkel-KORREKTUR wurde jedoch dieselbe hierarchische
Kaskade wie bei `icicle.js` übernommen (`korrigiereWinkelPropagiertProElternteil()`/
`skaliereNachkommenWinkel()`, hier für Winkel statt Pixel-Breite - beide
arbeiten auf demselben x0/x1-1D-Intervall-Konzept von `d3.partition()`, nur
die geometrische Interpretation unterscheidet sich): jede Ebene wird GETRENNT
pro Elternteil korrigiert, damit ein zu klein geratenes Kategorie-Segment
nicht die Unterkategorie-/Bestand-Segmente aus seiner eigenen Winkel-Spanne
herauslaufen lässt - exakt der bei Icicle per Nutzer-Rückmeldung entdeckte
und dort bereits behobene Fehler, hier von vornherein vermieden statt erneut
zu riskieren.

Farbe: Kategorie-Ring unverändert in vollen Kategoriefarben
(`faerbeKategorieSegment()`). Unterkategorie-Ring NEU über
`faerbeUnterkategorieSegment()` - dieselbe `farbeFuerUnterkategorie()` aus
`kategorieFarben.js` wie zuvor (nur zur Bestand-Feinabstufung genutzt), jetzt
zusätzlich direkt auf den Unterkategorie-Knoten selbst angewendet (der
bereits die von der Funktion erwartete Form hat: `.parent.children` sind die
Geschwister-Unterkategorien). Bestand-Ring unverändert über
`faerbeBestandSegment()`. "Ohne Kategorie" (Sonderfarbe `#8a8a8a` +
Punktmuster) live auf allen drei Ringen bestätigt (per `getComputedStyle()`-
gestütztem Auszug: 1 Kategorie-, 1 Unterkategorie-, 2 Bestand-Segmente mit
dem Muster).

### Schritt 3 - Einheitliches Klick-Verhalten

Neue Funktion `kategorieDatenVonKnoten(d)` (analog zu `icicle.js`s
gleichnamiger Funktion, läuft über `d.ancestors()` bis zur Tiefe 1 - robust
unabhängig davon, aus welchem der drei Ringe der Knoten stammt). Jeder Ring
bekommt in der Übersicht `klick: 'zoomen'`, ruft bei Klick/Enter/Leertaste
einheitlich `wechsleZuKategorie(kategorieDaten)` auf. Live bestätigt: Klick
auf ein Unterkategorie-Ring-Segment ("Kategorie Verwaltung öffnen") UND auf
ein Bestand-Ring-Segment ("Kategorie Vermögen und Finanzen öffnen") lösen
beide korrekt denselben Zoom-Übergang aus wie ein Kategorie-Ring-Klick -
`aria-label` und `cursor: zoom-in` vorab per `getComputedStyle()`/
`getAttribute()` verifiziert, nicht nur optisch angenommen.

### Schritt 4 - Gezoomte Ansicht: Verhalten bei Unterkategorie-Klick

**Frage (vom Auftraggeber ausdrücklich zur Entscheidung gestellt):** Was soll
ein Klick auf ein Unterkategorie-Segment in der Zoomansicht auslösen - keine
Wirkung, oder optische Hervorhebung der zugehörigen Bestand-Segmente?

**Entscheidung: keine Wirkung** (`klick: 'inert'` - kein `tabindex`, kein
`role`, kein Klick-/Tastatur-Handler, `cursor: auto`; Hover-/Fokus-Tooltip
bleibt informativ erreichbar, da unabhängig von `tabindex` per Maus-Hover
weiterhin funktioniert).

**Begründung:**
1. Eine Unterkategorie-Gruppe hat keinen einzelnen `record` - `sidebar.js`s
   Detailansicht ist strukturell strikt auf EINEN Bestand ausgelegt
   (`baueSidebarInhalt(record, ...)`), eine Erweiterung dafür wäre eine
   Änderung am Sidebar-Wrapper-Muster - ausdrücklich Nicht-Ziel.
2. Anders als bei einer Kategorie gibt es unterhalb einer Unterkategorie
   keine weitere Navigationsebene, in die ein Klick sinnvoll "hineinzoomen"
   könnte - die Kategorie-Ansicht IST bereits die tiefste Ebene dieses
   Moduls.
3. Das Modul hat mit dem Zentrum in der Übersicht bereits selbst exakt diese
   Konvention etabliert: ein Gruppen-Knoten ohne sinnvolles Klick-Ziel bleibt
   bewusst ohne Zeigercursor/Klick-Handler (`zeichneZentrum()`s eigener
   Kommentar: "reine Information ... kein Klick-Ziel, daher auch kein
   Zeigercursor/Hover-Effekt - vermeidet genau die ... Verwechslung 'sieht
   klickbar aus, ist es aber nicht'"). Die Alternative (Hervorhebung der
   zugehörigen Bestand-Segmente) hätte einen NEUEN Interaktions-Zustand
   eingeführt (welche Unterkategorie ist gerade hervorgehoben, wann wird das
   zurückgesetzt - beim erneuten Klick, beim Zoom-Rücksprung, bei jedem
   Redraw?) für einen Nutzen, der bereits über den bestehenden Hover-Tooltip
   abgedeckt ist. Die konsistente, risikoärmere Wahl war daher, die bereits
   im Modul vorhandene Konvention wiederzuverwenden statt eine neue
   einzuführen.

Bestand-Klick bleibt unverändert: Sidebar-Toggle, live bestätigt (öffnen,
erneuter Klick auf dieselbe Kachel schließt wieder, Auswahl-Rahmen
`AUSWAHL_FARBE` sichtbar).

### Schritt 5 - Beschriftung/Tooltip

`fuegeSegmentBeschriftungEin()` unverändert wiederverwendet - war bereits
Level-agnostisch (liest nur `d.y0/y1/x0/x1` des übergebenen Knotens, kennt
keine Ebenen-Semantik). Tooltip-Text: Kategorie-Ring unverändert (voller Text
nur, wenn kein Label Platz fand - derselbe `beschriftet`-Fallback wie zuvor),
Unterkategorie-Ring neu (`"<Name> (Kategorie: X, N Bestände)"`, Formulierung
bewusst an `icicle.js`s äquivalenten Text angeglichen), Bestand-Ring
unverändert (`baueTooltipText(d)`).

### Schritt 6 - Info-Button/Unsicherheiten-Toggle unverändert

Info-Button-MECHANISMUS (einmalige Erzeugung in `render()`, kein destroy()/
Neubau bei jedem Redraw, kein Listener-Leck-Risiko) byte-identisch belassen -
nur der Popover-TEXT wurde inhaltlich an die jetzt drei sichtbaren Ringe
angepasst (reine Wortwahl, kein Verhaltenscode). `export function resize()`
ebenfalls byte-identisch unverändert. Live bestätigt: Klick auf den globalen
"Unsicherheiten anzeigen"-Button togglet korrekt (`resize({showUncertainty})`),
unsichere Bestände im Zoom-Bestand-Ring zeigen weiterhin Schraffur + ⚠-Symbol
(2 von 142 Beständen der getesteten Kategorie).

### Regressionstest (Testport 9358, danach zurückgesetzt)

- **Treemap/Circle Packing unverändert:** beide Module live geöffnet,
  Screenshot bestätigt weiterhin genau EINE Ebene gleichzeitig sichtbar
  (Kategorie-Kacheln/-Kreise), keine Konsolenfehler - `grep` über beide
  Dateien nach den neu in `sunburst.js` eingeführten Funktions-/Klassennamen
  (`korrigiereWinkelPropagiertProElternteil`, `faerbeUnterkategorieSegment`,
  `sunburst-segment-`) bestätigt zusätzlich 0 Treffer, also keine
  versehentliche Übertragung.
- **Fokus-Indikator:** `getComputedStyle()` bestätigt `outline-style: none`
  auf einem fokussierten Segment (Standard-Browser-Rahmen bleibt unterdrückt,
  wie zuvor) UND den korrekten Stroke-Wechsel bei Fokus/Blur
  (`#ffffff`/1px ↔ `#e07820`/3px) - für alle drei Ring-Arten der Übersicht
  bestätigt, derselbe Mechanismus wie vor diesem Auftrag, nur jetzt auf mehr
  Ringen angewendet.
- Sidebar-Toggle, Zoom (jeder der drei Übersicht-Ringe) und Rücksprung
  (Zentrum-Klick), Resize (`window.dispatchEvent(new Event('resize'))`),
  Destroy/Neuaufbau (Modul-Wechsel zu Treemap/Circle Packing und zurück zu
  Sunburst), Info-Button, Unsicherheiten-Toggle: alle live bestätigt, keine
  Konsolenfehler in jedem einzelnen Testschritt.

### Nebenbefund (NICHT behoben, außerhalb des Auftragsumfangs)

In der Zoomansicht zeigt der Bestand-Tooltip fälschlich die UNTERKATEGORIE
statt der echten Kategorie in der Zeile "Kategorie: ...". Ursache:
`baueTooltipText()`/`kategorieVonKnoten()` (beide in `bestandsHierarchie.js`,
gemeinsam für treemap.js/sunburst.js/icicle.js/circlePacking.js/
ganttDiagramm.js) sucht per `d.ancestors().find(v => v.depth === 1)` nach der
Kategorie - das setzt voraus, dass Tiefe 1 in der jeweils übergebenen
Hierarchie immer die Kategorie ist. In der Zoomansicht wird die Hierarchie
aber lokal ab der Kategorie selbst neu aufgebaut (`d3.hierarchy
(aktuelleKategorieDaten)`, Tiefe 0 = die Kategorie), wodurch dort Tiefe 1
bereits die Unterkategorie ist. Live reproduziert: Tooltip eines
Bestand-Segments zeigte "Kategorie: Staatliche Verwaltung" UND
"Unterkategorie: Staatliche Verwaltung" identisch, während die tatsächliche
(korrekte) Kategorie "Verwaltung" hieß - sichtbar sowohl im Zentrum als auch
im Sidebar-Badge, das `instanz.aktuelleKategorieDaten.name` direkt nutzt und
deshalb NICHT betroffen ist. Bug ist nachweislich PRE-EXISTING: derselbe
Code-Pfad (`wireTooltip(gruppe, () => baueTooltipText(d), svgBereich)` auf
`wurzel.leaves()` einer lokal ab der Kategorie aufgebauten Hierarchie)
existierte unverändert bereits in der vorigen 2-Ebenen-Fassung dieses Moduls
- betrifft also nicht die hier neu hinzugekommene Unterkategorie-Ebene,
sondern ausschließlich den bereits vorher vorhandenen Bestand-Tooltip in der
Kategorie-Ansicht. Da die Ursache in der geteilten `bestandsHierarchie.js`
liegt (Nicht-Ziel dieses Auftrags: "nur Nutzung, keine Änderung"), nicht
behoben - dem Auftraggeber separat als eigenständiges Ticket vorgeschlagen.

---

## 2026-09-05 (14) – Neue Startseite (Landingpage) im Stil des alten Prototyps

**Betrifft:** neu `js/core/startseite.js`, `css/startseite.css`; geändert
`js/core/app.js`, `index.html`, `css/layout.css`. Kurzfassung in
`CHANGELOG.md`.

### Schritt 1 - Root-Cause/Bestandsaufnahme

**Frage:** Existiert bereits eine eigene Startseiten-Route, oder leitet die
App direkt auf den "Bestand"-Tab weiter?

**Befund (aktiv im Code geprüft, `js/core/app.js` und `js/core/router.js`
gelesen):** Es gibt keine eigene Startseiten-Route. Der Bootstrap-Code am
Dateiende von `app.js` enthielt bis zu diesem Auftrag:
```js
if (!location.hash) { navigiereZu(['bestand']); } else { handleRouteChange(); }
```
Ein leerer Hash (Root-URL) wurde damit UNCONDITIONAL sofort auf `#bestand`
umgeleitet, bevor `renderTab()` je mit einem leeren/`null`-Tab aufgerufen
worden wäre - die Root-URL landete faktisch immer direkt im Bestand-Tab,
ohne jede Zwischenstation. `router.js`s `parseHash('')` liefert zwar bereits
korrekt `{tab: null, ...}` (kein Fehler dort), aber `app.js` hat diesen Fall
nie erreicht.

**Fix:** Bootstrap ruft jetzt unconditional `handleRouteChange()` auf (kein
erzwungenes `navigiereZu(['bestand'])` mehr) - ein leerer Hash bleibt leer,
`renderTab(null)` zeigt dafür die neue `renderStartTab()`. `router.js`s
eigener interner Fallback (`location.hash || '#bestand'` für den - laut
Grep-Check nirgendwo tatsächlich gelesenen - `state.js`-Wert `aktiverTab`)
wurde bewusst NICHT angetastet (Nicht-Ziel, zusätzlich unnötig, da dieser
Wert für kein sichtbares Verhalten relevant ist).

**Landingpage ist bewusst KEIN sechster Nav-Tab** (Nicht-Ziel: Hauptnav
bleibt bei den fünf bestehenden Einträgen) - `renderTab(tab)` prüft `if
(!tab) return renderStartTab();` als allerersten Fall, vor allen fünf
bekannten Tab-Namen. `aktualisiereNavHervorhebung(null)` markiert
konsequenterweise keinen der fünf Links als aktuell - live verifiziert
(kein `aria-current` gesetzt, während die Startseite gezeigt wird).

### Referenzquelle: der alte Prototyp existiert real

Der Auftrag erwähnt einen "Referenz-Screenshot" (nicht im Chat als Bild
mitgegeben). Statt aus der Textbeschreibung zu raten: `css/base.css`s
eigener Kopfkommentar verweist bereits auf den Ursprung der Farbpalette
("Desktop/GitHub/Interface-Krems/index.html, :root-Block") - dieser Pfad
wurde geprüft und existiert tatsächlich auf diesem Rechner (12.372 Zeilen,
inkl. eingebetteter Bild-Assets `Krems-Urkunde-Friedrich-III-web.jpg`,
`books-web.jpg`, `körnermarkt.webp`, `netzwerk.png`). Struktur, exakte
CSS-Klassen, Farbwerte, das Logo-SVG und die Footer-Links wurden direkt aus
dieser realen Datei gelesen (`#hero-slider`, `.welcome-section`,
`.info-grid-section`, `.landing-footer`, `#logo-link`/`.logo-mark`,
Zeilen ~1810-2023 sowie die zugehörigen CSS-Regeln ~Zeile 46-269 und die
Karussell-JS-Logik ~Zeile 10022-10083) - eine deutlich verlässlichere
Grundlage als eine Rekonstruktion allein aus der Auftragsbeschreibung.
Inhalte (Texte) wurden dabei bewusst NICHT wörtlich übernommen, sondern an
die tatsächliche Struktur des neuen Interfaces angepasst (siehe unten) -
nur Struktur/Gestaltung/reale Fakten (Kontaktdaten, Logo, PDF-URLs) wurden
1:1 bzw. stilistisch übernommen, wie im Auftrag vorgesehen.

### Schritt 2 - Hero-Karussell

**Vorgeschlagene Slide-Texte (zur Prüfung, wie im Auftrag verlangt):**

| # | Kicker | Headline | CTA | Ziel |
|---|---|---|---|---|
| 1 | Für Entdecker:innen | Entdecken Sie das Gedächtnis der Doppelstadt Krems-Stein. | Zu den Visualisierungen | `#visualisierungen` |
| 2 | Geführte Einblicke | Historische Bestände anhand kuratierter Pfade kennenlernen. | Zu den Führungen | `#fuehrungen` |
| 3 | Für Forschende & Leser:innen | Literatur und Forschung rund um die Stadtgeschichte. | Zur Literatur | `#literatur` |
| 4 | Für Neueinsteiger:innen | Das Stadtarchiv Krems – ein digitaler Einstieg für alle. | Jetzt entdecken | `#bestand` |

Slide 1 und 4 sind nah am alten Original (dort thematisch bereits treffend),
Slide 2 ist NEU (der alte Prototyp bewarb "Führungen" auf der Startseite gar
nicht), Slide 3 ersetzt das alte "Urkunden digital recherchieren"/"Zum
Bibliothekskatalog" (externer Link, kein eigener Tab im neuen Interface)
durch einen Verweis auf den echten "Literatur"-Tab. Alle vier CTA-Ziele
zusammen decken vier der fünf echten Haupttabs ab (Bestand doppelt
erreichbar über Slide 1 UND 4, bewusst - Slide 1 verweist auf die
Visualisierungen selbst, Slide 4 ist der allgemeine "jetzt einsteigen"-Ruf).

**Platzhalterbilder:** vier CSS-Verlaufsflächen in archivtypischen, gedeckten
Farbtönen (Tinte-Blau/Grün für Visualisierungen, Sepia-Braun für Führungen,
Wein-Rot für Literatur, Gold-Blau-Übergang für den allgemeinen Einstieg) statt
echter Fotos, mit einer kleinen, abgerundeten "Platzhalterbild"-Marke unten
rechts pro Slide (`aria-hidden`, da rein visueller Entwicklungshinweis ohne
Mehrwert für Screenreader-Nutzende - Kicker/Headline tragen die eigentliche
Information).

**Interaktion:** Auto-Wechsel alle 7s (Auftrag: "6-8 Sekunden", Mittelwert
gewählt), deaktiviert bei `prefers-reduced-motion: reduce` (dieselbe
Rücksichtnahme wie im alten Prototyp, der dort allerdings 20s Intervall
nutzte - hier bewusst die im AKTUELLEN Auftrag explizit genannte Spanne
verwendet, nicht der alte Wert). Pfeile links/rechts, Klick-Punkte mit
`aria-pressed`, Pfeiltasten-Bedienung bei Fokus im Karussell-Bereich (der
gesamte `<section>` ist fokussierbar, `tabindex="0"`), zusätzlich sind alle
Punkte und Pfeile selbst normale, per Tab erreichbare `<button>`-Elemente
(Tab+Enter funktioniert damit nativ, ohne eigene Verdrahtung).

**Live-Verifikation:** 4 Slides vorhanden, Pfeil-Klick/Punkt-Klick/
Pfeiltasten bewegen den aktiven Slide korrekt (bei den ersten Tests zunächst
scheinbar "falsche" Sprünge beobachtet - Root-Cause-Check ergab: die
Auto-Wechsel-Automatik lief während der mehrsekündigen Verzögerung zwischen
den einzelnen Test-Aufrufen bereits selbstständig weiter, kein Fehler,
sondern der Beleg dafür, dass die Automatik korrekt funktioniert; mit
kürzeren Abständen zwischen den Prüfungen bestätigten sich alle
Bedienelemente eindeutig). `aria-pressed` auf den Punkten korrekt
synchronisiert.

### Schritt 3 - Einleitungstext

**Vorgeschlagener Text (zur Prüfung):**

> "Willkommen im digitalen Interface des Stadtarchivs Krems an der Donau.
> Unsere Bestände reichen bis in das Jahr 1108 zurück und bewahren das
> schriftliche Gedächtnis der historischen Doppelstadt Krems-Stein. Dieses
> Interface macht den gesamten Bestandsbaum als interaktive Visualisierung
> erfahrbar – nach Kategorie, Zeitraum und Umfang erkundbar, ergänzt um
> geführte Pfade und weiterführende Literatur."

Erfüllt dieselbe kommunikative Aufgabe wie das alte Original (Begrüßung,
historischer Umfang seit 1108, Hinweis auf den Inhalt), ist aber NICHT
wörtlich übernommen (das Original nennt konkret "eine rund 1.000 Stück
umfassende Urkundensammlung" als eigenständigen Bestandteil - im neuen
Interface gibt es dafür keinen separaten Tab/keine separate Datenbank,
weshalb dieser Satz bewusst durch einen auf die tatsächlich vorhandenen
Bestandsvisualisierungen bezogenen Hinweis ersetzt wurde).

### Schritt 4 - Drei-Spalten-Kachelbereich

**Vorgeschlagene Kachel-Texte (zur Prüfung):**

| Titel | Text | CTA | Ziel |
|---|---|---|---|
| Unsere Bestände visualisiert | Der gesamte Bestand des Stadtarchivs als interaktive Treemap, Sunburst, Icicle, Circle Packing und Zeitachse – nach Kategorie, Zeitraum und Umfang erkundbar. | Visualisierungen entdecken → | `#bestand` |
| Geführte Pfade | Kuratierte Einblicke in ausgewählte Themen und Zeiträume des Archivs – ein guter Einstieg für alle, die nicht auf eigene Faust recherchieren möchten. | Zu den Führungen → | `#fuehrungen` |
| Literatur & Forschung | Publikationen und Literaturhinweise rund um die Geschichte der Stadt Krems und ihres Archivs. | Zur Literatur → | `#literatur` |

**Root-Cause-Check zur dritten Kachel (explizit im Auftrag gefordert):** das
alte Original hatte als dritte Kachel "Service & Lesesaal" (Öffnungszeiten,
Voranmeldungslink, Kontakt-E-Mail). Geprüft, ob das neue Interface eine
entsprechende Funktion/Information besitzt: weder im "Über"-Platzhalter
(aktuell nur "Projektbeschreibung, Datengrundlage und Unsicherheitslegende
folgen in einer späteren Etappe.") noch irgendwo sonst existiert eine
Lesesaal-/Öffnungszeiten-Seite. Eine erfundene Entsprechung wäre irreführend
gewesen (genau das im Auftrag benannte Risiko). Da der Auftrag jedoch
UNABHÄNGIG davon bereits explizit eine eigene Führungen-Kachel verlangt (im
alten Original auf der Startseite gar nicht beworben, im neuen Interface
aber ein echter, wenn auch noch als Platzhalter geführter Tab), ergaben sich
die drei Kacheln von selbst aus den tatsächlich vorhandenen Tabs
(Bestand/Führungen/Literatur) - keine "nur zwei Kacheln"-Notlösung nötig,
aber auch keine erfundene dritte Thematik: alle drei Kacheln haben ein
echtes Ziel im neuen Interface.

### Schritt 5 - Footer

**Root-Cause-Frage:** sind die drei PDF-Dateien im Projekt vorhanden, oder
müssen die Links auf nicht existierende Pfade zeigen?

**Befund (aktiv geprüft, nicht angenommen):** Im Projektordner (`GI_2.0`)
existiert kein `assets`-/`docs`-Ordner mit diesen drei Dateien - lokale
Pfade wären tatsächlich tote Links. Im alten Prototyp (`Desktop/GitHub/
Interface-Krems/index.html`, Zeile 2016-2018) verweisen dieselben drei
Footer-Links jedoch bereits nicht auf lokale Dateien, sondern auf reale,
öffentlich gehostete PDFs auf der offiziellen Stadt-Krems-Website:
- `https://www.krems.at/fileadmin/user_upload/Archiv_Krems_Archivordnung_publiziert_03_2019.pdf`
- `https://www.krems.at/fileadmin/user_upload/Benuetzerordnung_Stadtarchiv_Krems_Jaenner_2020.pdf`
- `https://www.krems.at/fileadmin/user_upload/Stadtarchiv_Krems_ISDIAH_2023.pdf`

Diese echten, funktionierenden externen URLs wurden unverändert übernommen -
kein Bedarf für tote/erfundene Pfade, da die alte Referenzquelle die
tatsächliche Lösung bereits enthielt.

Kontaktdaten (Name, Adresse, Telefon, E-Mail, Website) ebenfalls 1:1 aus
derselben Quelle übernommen, wie im Auftrag vorgesehen (reale, vorhandene
Daten).

### Schritt 6 - Logo/Wortmarke

Zweizeilige Wortmarke: dieselbe SVG wie im alten Prototyp (ein stilisiertes
"k" in Gelb `#fc0` plus die restlichen Buchstaben "rems" in Schwarz als
Vektorpfade, insgesamt ein einziges Logo-SVG, viewBox 140.73×47.75) plus
`<span>Stadtarchiv</span>` als kleinere Unterzeile (Großschreibung/
Buchstabenabstand per CSS, `.app-logo-sub { text-transform: uppercase;
letter-spacing:.13em; font-size:.65rem; }`) - reale, bereits für dieses
Projekt genutzte Wortmarke, keine neu erfundene Grafik. Ersetzt den
bisherigen Textschriftzug `<span class="app-logo">Stadtarchiv Krems</span>`.
Zusätzlich (nicht explizit gefordert, aber bei einem Logo/einer Wortmarke
allgemein üblich und mit geringem Risiko): der Logo-Link führt jetzt auf die
neue Startseite (`href="#"`) statt nirgendwohin zu verlinken.

### Schritt 7 - Responsivität

Live an zwei Viewport-Größen geprüft (wie im Regressionstest gefordert):
- **375×812 (Mobiltelefon):** kein horizontaler Überlauf
  (`document.documentElement.scrollWidth <= clientWidth`), Hero korrekt auf
  volle 375px Breite, Hero-Höhe reduziert auf 340px (eigene Medienabfrage),
  Headline-Schriftgröße reduziert auf 22,4px (1,4rem), Kacheln- und
  Footer-Raster jeweils einspaltig, Header bricht korrekt um (bestehende
  `@media (max-width:700px)`-Regel aus layout.css, unverändert wirksam).
- **768×1024 (Tablet):** kein horizontaler Überlauf, Hero auf volle Breite,
  Kacheln-Raster einspaltig (< 900px-Schwelle), Footer-Raster zweispaltig
  (> 680px-Schwelle) - beide Zwischenzustände korrekt getroffen.

### Regressionstest

Bestand-Tab inkl. Treemap (1 SVG) und Gantt-Diagramm (297 Balken)
weiterhin unverändert funktionsfähig nach dem Routing-Umbau. Kachel-Link
"Literatur" navigiert korrekt zu `#literatur` (Platzhalterseite erscheint,
Nav-Hervorhebung korrekt auf "Literatur"). Logo-Klick von `#literatur` aus
führt korrekt zurück zur Startseite (Hero wieder vorhanden, KEIN Nav-Link
als aktuell markiert). Keine Konsolenfehler über den gesamten Testlauf
(Root-URL-Aufruf, Karussell-Interaktion, Tab-Wechsel, Resize).

---

## 2026-09-05 (13) – Gantt-Diagramm: Sidebar, Namens-Tooltip, größerer Hover-Bereich

**Betrifft:** `js/viz/ganttDiagramm.js`. Kurzfassung in `CHANGELOG.md`.

### Abschluss-Frage: musste `sidebar.js` angepasst werden?

**Nein - unverändert wiederverwendet.** `baueSidebarGeruest()`,
`oeffneSidebar()`, `schliesseSidebar()`, `fuegeSidebarStyleEin()` wurden 1:1
importiert, exakt wie bei treemap.js/sunburst.js/circlePacking.js (gleicher
Alias-Import: `oeffneSidebar as oeffneSidebarModul`,
`schliesseSidebar as schliesseSidebarModul`). `sidebar.js` selbst kennt laut
eigenem Dateikopf-Kommentar bewusst keine Geometrie-/Interaktionsannahmen
des aufrufenden Moduls (nur Container, `record`, Kategorie-Konfiguration) -
diese Void-of-Assumptions-Bauweise erwies sich als exakt ausreichend für den
Gantt, ohne jede Anpassung. Live gegen Sunburst UND Circle Packing
(bestehende Sidebar-Nutzer) gegengeprüft: beide funktionieren nach den
Gantt-Änderungen unverändert.

### Punkt 1 - Sidebar bei Balken-Klick

**Struktur-Frage aus dem Auftrag:** ist die etablierte `svgBereich`-Struktur
direkt übernehmbar, oder muss sie angepasst werden, damit ein Redraw beim
Pan/Zoom die Sidebar nicht mitlöscht (das beim Sunburst bereits einmal
aufgetretene Problem)?

**Befund:** NICHT direkt übernehmbar in der bisherigen Gantt-Form. Die
anderen vier Module haben genau EINEN wachsenden/schrumpfenden `svgBereich`-
Container, dessen `innerHTML` bei jedem Redraw geleert wird, während die
Sidebar als GESCHWISTER direkt in `container` (NICHT in `svgBereich`) hängt
und dadurch nie mitgelöscht wird - `render()` leert `container.innerHTML`
nur EINMAL, `zeichneXXX()` (die Redraw-Funktion) leert danach nur noch
`svgBereich.innerHTML`. Der Gantt hatte VOR diesem Auftrag exakt den
gegenteiligen, riskanten Aufbau: `zeichneGantt()` (aufgerufen bei jedem
`resize()`/Unsicherheiten-Toggle - NICHT bei jedem Pan/Zoom-Tick, das läuft
rein attributbasiert ohne Redraw, siehe vorheriger Eintrag) leerte bislang
`container.innerHTML` bei JEDEM Aufruf - hätte eine Sidebar dort direkt als
Kind von `container` gehangen, wäre sie bei jedem `resize()`/Toggle
mitgelöscht worden, exakt der beim Sunburst dokumentierte Fehler.

**Fix (Restrukturierung, bevor die Sidebar überhaupt verdrahtet wurde):**
`render()` legt jetzt einen `wurzel`-Wrapper-Div UND die Sidebar als
GESCHWISTER direkt in `container` an (`container.innerHTML=''` nur hier,
einmalig). `zeichneGantt()` leert seither `wurzel.innerHTML` statt
`container.innerHTML` - identisches Prinzip wie bei den anderen vier
Modulen, nur mit `wurzel` statt `svgBereich` als Name für den wiederholt
geleerten Container. `fuegeStyleEin(container)`/`fuegeSidebarStyleEin
(container)` wurden dafür ebenfalls von `zeichneGantt()` nach `render()`
verschoben (sonst hätten sich bei jedem Redraw doppelte `<style>`-Tags in
`container` angesammelt, da `container` nicht mehr bei jedem Redraw geleert
wird).

**Live-Verifikation (genau der im Auftrag benannte Risikofall):** Balken
"Ingedenkbücher" angeklickt (Sidebar öffnet, Titel korrekt, Balken erhält
`gantt-ausgewaehlt`) - DANACH Unsicherheiten-Toggle ausgelöst (derselbe
Redraw-Pfad wie `resize()`, baut alle 315 Zeilen komplett neu auf): Sidebar
blieb bestätigt offen (`sidebarKlasseNachRedraw: "bestand-sidebar offen"`,
`titelNachRedraw: "Ingedenkbücher"`), UND die Auswahl-Markierung wurde
korrekt auf den NEUEN (da neu gezeichneten) Balken-Knoten übertragen
(`balkenKlasseNachRedraw: "gantt-balken-zeile gantt-ausgewaehlt"`) - die neue
`aktualisiereAuswahlMarkierung()`-Funktion, die am Ende jedes `zeichneGantt()`
läuft, macht genau das.

**Toggle-Verhalten:** erneuter Klick auf den bereits ausgewählten Balken
schließt die Sidebar wieder (verifiziert: `sidebarKlasse` fällt von
`"bestand-sidebar offen"` auf `"bestand-sidebar"`, Balken verliert
`gantt-ausgewaehlt`). Schließen-Button (×) verifiziert ebenso wirksam.
Dieselbe Prüfung zusätzlich für eine "ohne Zeitangabe"-Zeile durchgeführt
(Marker "Auswärtige Theaterzettel") - Öffnen, Auswahl-Markierung, Toggle-
Close alle korrekt.

**Auswahl-Markierung visuell klar unterscheidbar vom Hover (explizit
gefordert):** solides `var(--accent)`-Blau (#2c4a6e, dieselbe Akzentfarbe,
die app-weit für "aktiv" steht), 3px, OHNE Dash/Glow - im Gegensatz zum
orangen (`#e07820`), gestrichelt-glühenden Hover-Rahmen aus dem vorherigen
Auftrag. `.gantt-ausgewaehlt`-Regel bewusst NACH der `.gantt-hervorgehoben`-
Regel im Stylesheet platziert (gleiche Selektor-Spezifität) - eine dauerhafte
Auswahl soll nicht von einem flüchtigen Hover überdeckt werden. Live
verifiziert: Balken gleichzeitig ausgewählt UND gehovert zeigt `stroke: rgb(
44, 74, 110)` (= var(--accent)), NICHT die orangene Hover-Farbe - Auswahl
gewinnt wie vorgesehen. Bei reinem Hover (ohne Auswahl) zeigt derselbe Balken
korrekt wieder die weiße Standard-Umrandung eines unselektierten Balkens
bzw. bei tatsächlichem Hover die orange Hervorhebung - beide Zustände klar
getrennt reproduzierbar.

Fokus-Fallback beim Schließen bewusst NICHT ein einzelner fester
`svgBereich` (den es beim Gantt strukturell nicht gibt, da Namensspalte und
Zeitbereich getrennte Container sind), sondern das konkret betroffene
Balken-/Marker-Element selbst, aus `gruppeNachSchluessel` aufgelöst - eine
präzisere, dem "Fokus soll dahin zurückkehren, wo man war"-Prinzip noch
direkter entsprechende Wahl als bei den anderen Modulen.

### Punkt 2 - Tooltip bei Hover über Bestandsnamen

**Ist-Zustand bestätigt:** vor diesem Auftrag existierte in `baueNamensspalte
()` keinerlei Tooltip-Verdrahtung - Hover über die (ggf. gekürzte)
Namensspalte zeigte nichts an.

**Fix:** `mouseenter`/`mouseleave` auf der GESAMTEN `.gantt-namensspalte-
zeile` (nicht nur dem `.gantt-namensspalte-name`-Span) verdrahtet, ruft
`zeigeTooltip(baueGanttTooltipText(blatt), zeile, container)` - identische
Tooltip-Funktion und identischer Inhalt wie beim Balken-Hover, keine
Duplikation. Verknüpfung ergibt sich hier trivial aus dem bereits
vorhandenen `blatt`-Objekt in der `forEach`-Schleife beim Bau der
Namensspalte - kein zusätzlicher `kuerzel`-Lookup nötig (im Gegensatz zum
Hover-Highlighting, das zwei getrennte DOM-Bäume verbinden muss).

**Live-Verifikation:** Hover über Namenszeile "Ingedenkbücher" zeigt exakt
denselben Tooltip-Text wie zuvor beim Balken-Hover verifiziert
(`"Zeitraum: 1108–1781\nIngedenkbücher\nKategorie: Kultur\n..."`),
`mouseleave` versteckt ihn zuverlässig (Opacity 0).

### Punkt 3 - Zu kleiner Hover-/Klick-Bereich bei "ohne Zeitangabe"

**Root-Cause-Frage aus dem Auftrag:** ist die Hover-/Klick-Zone exakt auf
die sichtbare Breite/Höhe des gestrichelten Platzhalters begrenzt?

**Befund: JA, und sogar enger als die sichtbare Fläche selbst.** Die
Markierung hatte `fill="none"` (nur `stroke`, gestrichelt `3,2`). Nach
SVG-Spezifikation zählt bei `pointer-events: visiblePainted` (Standardwert)
eine `fill:none`-Fläche NICHT als "painted" und trägt daher NICHT zur
Trefferfläche bei - nur der Stroke-PFAD selbst reagiert auf Zeiger-
Ereignisse, und dieser ist durch das Dash-Muster zusätzlich perforiert
(abwechselnd 3px Strich, 2px Lücke). Der reale interaktive Bereich war damit
nicht einmal die volle 90×16px-Fläche des sichtbaren Rechtecks, sondern nur
ein dünner, lückenhafter Rand davon - exakt der gemeldete "nur bei sehr
präziser Mausposition"-Effekt.

**Fix:** neue, unsichtbare Trefferflächen-Rect
(`.gantt-ohne-zeitraum-trefferflaeche`, `fill="transparent"` - zählt laut
Spezifikation SEHR WOHL als "painted" trotz visueller Unsichtbarkeit,
Standardtrick für unsichtbare SVG-Klickflächen) als ERSTES Kind der
`<g>`-Gruppe eingefügt (liegt damit unter der sichtbaren Markierung, ohne
deren Optik zu beeinflussen). Deckt die VOLLE Zeilenhöhe ab (`ZEILE_GESAMT` =
19px statt nur der Balkenhöhe 16px) und dieselbe Breite wie die sichtbare
Markierung (90px - bereits deutlich großzügiger als
`MINDESTBALKENBREITE_PX` von 24px, die reguläre Balken als Mindestmaß
garantieren). Die vorher generische CSS-Regel `.gantt-ohne-zeitraum-marker
rect` (für Fokus-/Hover-Stil) wurde auf die neue, spezifische Klasse
`.gantt-ohne-zeitraum-sichtbar` umgestellt, damit dieselbe Regel nicht
versehentlich auch die neue unsichtbare Trefferflächen-Rect einfärbt und sie
dadurch sichtbar machen würde.

**Da Tooltip, Hover-Highlighting UND die neue Klick-Auswahl alle auf
`.on(...)` derselben `<g>`-Gruppe verdrahtet sind** (nicht auf das einzelne
sichtbare Rect), profitieren alle drei Interaktionen automatisch UND
gleichermaßen von der vergrößerten Trefferfläche - keine dreifache
Änderung nötig, wie im Auftrag gefordert.

**Live-Verifikation (grobe Maus-Testbewegung über mehrere Punkte, wie
explizit gefordert, NICHT nur ein einzelner Klickpunkt):** Zeile in den
sichtbaren Bereich gescrollt, dann `document.elementFromPoint()` an 4 über
die gesamte Zeile verteilten Punkten geprüft: oben-links, Zeilenmitte
(vorher NICHT trefferfähig gewesen, da mitten in der `fill:none`-Fläche),
unten-rechts, sowie am Badge-Text - alle 4 Punkte lösen jetzt korrekt zu
einem Element INNERHALB der Marker-Gruppe auf (`istInnerhalbMarker: true`
bei allen 4). Klick auf die Gruppe (repräsentativ für jeden dieser Punkte,
da alle im selben Hit-Testing-Bereich liegen) öffnet zuverlässig die
Sidebar mit korrektem Titel, Toggle-Close funktioniert ebenso.

### Regressionstest

Frischer Server/Tab: Hover-Highlighting bidirektional weiterhin korrekt
(eigener Testfehler beim ersten Durchlauf berichtigt - versehentlich die
Klasse des gehoverten Balkens statt der zugehörigen Namenszeile geprüft;
nach Korrektur bestätigt: `gantt-namensspalte-zeile gantt-hervorgehoben`
korrekt gesetzt). Pan/Zoom unverändert (`k: 1→2.25→1` über Buttons).
Tastaturfokus: `focus` auf einem Balken hebt weiterhin die zugehörige
Namenszeile hervor, `Enter` öffnet/schließt jetzt zusätzlich die Sidebar
(neue Funktionalität, korrekt verifiziert). Echtes Fenster-Resize: Balken-
Anzahl (297) und Namensspalten-Breite (220px, Regressionsschutz für den
Flexbox-Fix aus dem vorherigen Auftrag) bleiben korrekt, Sidebar bleibt
vorhanden. Modulwechsel zu Circle Packing UND Sunburst (beide Sidebar-
Nutzer): sauberer Gantt-Teardown (`ganttWurzelReste: 0`), beide Module
funktionieren unverändert (Circle Packing: 12 Kreise, eigene Sidebar-Instanz
korrekt neu aufgebaut; Sunburst: Kategorie-Klick zoomt korrekt in 14
Pfad-Segmente). Keine Konsolenfehler über den gesamten Testlauf.

---

## 2026-09-05 (12) – Gantt-Diagramm: Skalen-Versatz behoben, Hover-Highlighting ergänzt

**Betrifft:** `js/viz/ganttDiagramm.js`. Kurzfassung in `CHANGELOG.md`.

### Bug-Report des Auftraggebers (Root-Cause-Verdacht)

Balkenposition und Zeitachsen-Beschriftung nutzten offenbar zwei
unterschiedliche, nicht synchronisierte Skalen - Beleg: "Ingedenkbücher"
beschriftet mit "1108–1781", Balken beginnt aber optisch deutlich rechts
von der 1100er-Achsenmarke (ca. bei "1300"). Gleiches Muster bei
"Chronologische Reihe (Krems)" ("1500–1866", Balkenbeginn optisch bei ca.
"1690"). Drei explizite Fragen: (1) nutzen Achse und Balken dieselbe
`xScale`-Instanz? (2) bleibt das nach dem Pan/Zoom-Fix synchron? (3) woher
stammt der Domain-Endwert 2100 - reales Maximum von `zeitraum_bis`
verifizieren.

### Root-Cause-Check (aktiv geprüft, Vermutung NICHT in der vermuteten Form
bestätigt - echte Ursache an anderer Stelle gefunden)

**Frage 1+2 (gleiche xScale-Instanz):** `zeichneGantt()` gelesen -
`xSkalaBasis` wird EINMAL erzeugt und sowohl an `zeichneAchse(achseGruppe,
xSkalaBasis)` als auch an `aktualisierePositionen(balken, texte,
xSkalaBasis)` übergeben (identische Objektreferenz). Im Zoom-Handler
(`wireZoom()`) wird bei jedem `zoom`-Ereignis `event.transform
.rescaleX(xSkalaBasis)` gebildet und DIESELBE neu berechnete Skala an
BEIDE Aufrufe (`zeichneAchse()` UND `aktualisierePositionen()`) weitergereicht
- keine zwei getrennten Skalen, auch nach dem Pan/Zoom-Fix nicht. Diese
Vermutung des Auftraggebers ist damit widerlegt.

**Frage 3 (Domain-Endwert):** `xSkalaBasis = d3.scaleLinear().domain(
jahresSpanne).range([...]).nice()` - `.nice()` rundet die Domain-Enden auf
"runde" Werte basierend auf der Standard-Tick-Anzahl (10), NICHT auf die
realen Daten. Live geprüft (`xSkalaBasis.domain()` indirekt über die
gerenderten Achsen-Ticks rekonstruiert): bei der realen Spanne
[1108, 2024] rundete `.nice()` auf **[1100, 2100]** - ein willkürlicher,
76 Jahre über dem echten Maximum (2024) liegender Wert. Damit war die
Vermutung des Auftraggebers zum Domain-Endwert korrekt.

**Die eigentliche Ursache des gemeldeten visuellen Versatzes** lag nicht in
der Skalen-Logik selbst, sondern in der Zwei-Spalten-Layout-CSS: live per
`getBoundingClientRect()` gemessen: `.gantt-namensspalte` (Body-Spalte)
hatte eine tatsächliche Breite von **520,8px**, während
`.gantt-kopf-namensplatzhalter` (Kopf-Spalte, die vor der Zeitachse Platz
lässt) korrekt bei **220px** blieb - ein Unterschied von ca. 300px.
`getComputedStyle()` zeigte: `flexBasis: "220px", flexGrow: "0",
flexShrink: "0"`, aber `width: "520.797px"` und **`minWidth: "auto"`**.
Root-Cause: CSS-Flex-Items haben als Initialwert `min-width: auto`, was NICHT
0 bedeutet, sondern "das automatische Minimum aus dem Inhalt" - bei einem
Nachfahren mit `white-space: nowrap` (`.gantt-namensspalte-name`, für die
Ellipsis-Kürzung) kann dieses automatische Minimum die unwrapped Breite des
LÄNGSTEN Namens sein (hier: "Auszüge aus den Ratsprotokollen über dem Rat
erlegte Gelder von Depositen- und Waisenkassa", ca. 87 Zeichen). Der
Flex-Item selbst (`.gantt-namensspalte`) hatte kein `min-width: 0`, wodurch
sein eigenes automatisches Minimum trotz `flex: 0 0 220px` auf die vom
längsten Namen benötigte Breite anwuchs - `.gantt-kopf-namensplatzhalter`
war davon nicht betroffen, da sein Inhalt (der kurze, feste Text "Bestand")
nie so breit werden konnte. Da Achse und Balken beide korrekt in Bezug auf
ihre JEWEILS EIGENE, gleich breite SVG (`zeitbereichBreite`) positioniert
waren, aber die SVGs selbst wegen der ungleichen Spaltenbreiten
unterschiedlich weit links auf dem Bildschirm begannen (Kopf-SVG bei
Bildschirm-x=236, Body-SVG bei Bildschirm-x=536,8), ENTSTAND der optische
Eindruck einer Skalen-Diskrepanz, obwohl beide SVGs INTERN identische,
korrekt synchronisierte Koordinaten verwendeten. Bei ca. 1,2px/Jahr entspricht
ein 300px-Versatz ca. 250 Jahren - exakt in der Größenordnung der vom
Auftraggeber berichteten Verschiebungen (~190-200 Jahre optisch geschätzt,
Größenordnung stimmt überein).

### Fix

1. `min-width: 0` auf `.gantt-namensspalte` UND (defensiv, für zukünftige
   Kopf-Texte) auf `.gantt-kopf-namensplatzhalter` ergänzt - der Standard-
   Fix für dieses bekannte CSS-Flexbox-Verhalten. Die bereits vorhandene
   `min-width: 0` auf der INNEREN `.gantt-namensspalte-name` reichte nicht,
   da sie nur diesen einen Nachfahren betraf, nicht den äußeren Spalten-Div
   selbst.
2. Domain-Berechnung ersetzt: statt `.nice()` werden die Domain-Enden jetzt
   explizit auf volle 10 Jahre ab- (`Math.floor(min/10)*10`) bzw. aufgerundet
   (`Math.ceil(max/10)*10`) - "ein sinnvoller kleiner Puffer" statt einer vom
   Tick-Algorithmus bestimmten, potenziell beliebig großen Rundung: real
   1108-2024 ergibt jetzt Domain [1100, 2030] (6 Jahre Puffer statt 76).

### Verifikation (wie explizit gefordert: mit konkreten Pixel-/Jahr-Werten,
nicht nur visuell)

Nach dem Fix: `namensspalteBreite: 220, kopfPlatzhalterBreite: 220` (identisch,
vorher 520,8 vs. 220); Bildschirm-x beider SVGs identisch (`achseSvgLeft:
236, bodySvgLeft: 236`, vorher 236 vs. 536,8). Domain-Ticks reichen jetzt bis
"2000" als letzten beschrifteten Tick (Domain-Ende 2030), keine "2100"-Marke
mehr.

Pixelgenaue Prüfung an 5 Beständen unterschiedlicher Jahrzehnte (inkl. beider
vom Auftraggeber genannten) gegen eine aus ALLEN sichtbaren Achsen-Ticks per
linearer Regression rekonstruierte Skala (Steigung exakt 1,2px/Jahr,
bestätigt gegen die bekannte Formel `range/domain`):

| Bestand | von-bis | Soll-x | Ist-x | Diff | Soll-Breite | Ist-Breite | Diff |
|---|---|---|---|---|---|---|---|
| Ingedenkbücher | 1108–1781 | 22,1 | 21,6 | −0,5 | 807,6 | 807,6 | 0 |
| Chronologische Reihe (Krems) | 1500–1866 | 492,5 | 492,0 | −0,5 | 439,2 | 439,2 | 0 |
| Weinzehentbücher Passauisches Leseamt Stein | 1659–1777 | 683,3 | 682,8 | −0,5 | 141,6 | 141,6 | 0 |
| Satzbuchurkunden | 1826–1835 | 883,7 | 883,2 | −0,5 | 24,0 | 24,0 | 0 |

Der durchgehend KONSTANTE Versatz von exakt −0,5px (unabhängig vom Jahr,
nicht proportional zur Zeitspanne) ist ein Sub-Pixel-Rendering-Artefakt der
Tick-Positions-Ablesung (d3-Achsen richten Tick-Linien häufig auf
halbe Pixel aus, um bei 1px-Strichbreite scharfe statt verwaschene Linien zu
erzeugen - "crisp edges") und KEIN Skalenfehler - ein echter
Synchronisationsfehler hätte einen mit der Zeitspanne wachsenden, nicht
konstanten Versatz gezeigt (wie ursprünglich beim gemeldeten Bug: ~190-250
Jahre, nicht 0,5px). Alle Balkenbreiten stimmen exakt (Diff 0) mit den aus
von/bis berechneten Soll-Breiten überein.

### Ergänzung: Hover-Highlighting Namensspalte <-> Balken

**Umsetzung:** Neue Funktion `schluesselFuerBlatt(blatt)` liefert
`blatt.data.record.kuerzel` als stabilen, positionsunabhängigen Schlüssel -
vor der Verwendung live gegen die echten Daten verifiziert:
`{gesamt: 315, leereKuerzel: 0, einzigartigeKuerzel: 315}` - bei JEDEM
Bestand vorhanden und garantiert eindeutig, damit als Verknüpfungsschlüssel
geeignet (explizit NICHT der Array-Index, wie vom Auftraggeber gefordert -
bleibt dadurch auch nach künftigen Sortier-/Filteränderungen korrekt).

`baueNamensspalte()` gibt jetzt zusätzlich eine `Map<kuerzel,
Zeilen-Element>` zurück; `zeichneBalken()`/`zeichneOhneZeitraumMarker()`
geben ihre `<g>`-Selektion zusätzlich zurück. Neue Funktion
`wireHervorhebung(zeileNachSchluessel, gruppenAuswahlen)` baut daraus eine
`Map<kuerzel, SVG-Gruppen-Element>` und verdrahtet bidirektional:
Namenszeile `mouseenter`/`mouseleave` schaltet die Klasse
`gantt-hervorgehoben` auf dem zugehörigen Balken/Marker um (per
`addEventListener` auf den rohen DOM-Knoten der Namensspalte); Balken/Marker
`mouseenter`/`focus` bzw. `mouseleave`/`blur` (eigener d3-Namespace
`.hervorheben`, koexistiert unabhängig neben dem bereits vorhandenen
`.tooltip`-Namespace auf denselben Elementen) schaltet dieselbe Klasse
umgekehrt auf der zugehörigen Namenszeile um. Tastaturfokus auf einem
Balken/Marker hebt damit ebenfalls automatisch die zugehörige Namenszeile
hervor (dieselbe Klasse wie bei Maus-Hover) - ein zusätzlicher
Barrierefreiheits-Nutzen, der über die Mindestanforderung hinausgeht.

**Visuelle Gestaltung** (Auftrag: "klar unterscheidbar, ohne Kategoriefarbe
zu verdecken"): Balken/Marker erhalten einen verstärkten Rahmen (Stroke
3px statt normal 1-2px) in derselben Akzentfarbe `#e07820`, die im Modul
bereits für den Tastatur-Fokusring verwendet wird (Wiedererkennung statt
neuer Farbcode), plus einen dezenten Glow (`filter: drop-shadow(0 0 3px
rgba(224,120,32,0.7))`) - NUR der `stroke` ändert sich, `fill` (die
Kategoriefarbe) bleibt unverändert sichtbar. Diese CSS-Regel überschreibt
die per `.attr()` gesetzte Stroke-Farbe/-breite zuverlässig, da
SVG-Präsentationsattribute laut Spezifikation von jeder CSS-Regel mit
echter Selektor-Spezifität überschrieben werden (dieselbe bereits
etablierte Eigenschaft, auf der die vorhandene `:focus`-Regel im selben
Modul beruht). Die Namenszeile erhält eine helle Orange-Tönung plus einen
linken Akzentstreifen (`box-shadow: inset 3px 0 0 #e07820`) - bewusst NACH
der `:nth-child(even)`-Zebrastreifen-Regel im Stylesheet platziert (gleiche
Selektor-Spezifität, 0,2,0 zu 0,2,0), damit sie per Quellreihenfolge
unabhängig von Gerade/Ungerade gewinnt.

**Verifikation (live, alle im Auftrag genannten Fälle geprüft):**
- Hover auf Namenszeile "Ingedenkbücher" -> zugehöriger Balken erhält
  `gantt-hervorgehoben`; `mouseleave` entfernt sie zuverlässig.
- Hover auf Balken "Chronologische Reihe (Krems)" -> zugehörige Namenszeile
  erhält die Klasse (symmetrische Richtung bestätigt); Tastaturfokus
  (`focus`/`blur`) auf demselben Balken zeigt identisches Verhalten.
- Schnelles Wechseln zwischen zwei Zeilen OHNE die erste ordentlich zu
  verlassen (`mouseenter` Zeile A, `mouseenter` Zeile B, dann BEIDE
  `mouseleave`): während beide "aktiv" sind, sind korrekt beide Balken
  hervorgehoben (`wahrendBeide: 2`), nach beiden `mouseleave` ist die Klasse
  zuverlässig bei 0 Elementen (`nachBeideVerlassen: 0`) - kein
  Hängenbleiben bei schnellem Wechsel.
- "Ohne Zeitangabe"-Zeile getestet: Hover hebt korrekt den gestrichelten
  Platzhalter-Marker hervor, `mouseleave` entfernt es wieder.
- **Balken außerhalb des sichtbaren Zeitachsen-Ausschnitts** (explizit im
  Akzeptanzkriterium gefordert): nach viermaligem Reinzoomen (`k=5,06`)
  wurde "Ingedenkbücher" (Jahr 1108, ganz am linken Domain-Rand) weit aus
  dem sichtbaren Bereich herausgepannt (`rectX: -2222,5`, deutlich
  außerhalb `[0, Zeitbereichbreite]`). Hover auf die Namenszeile hob den
  (unsichtbaren) Balken trotzdem korrekt hervor (`hervorgehobenTrotzUnsichtbar:
  true`) - kein automatisches Scrollen/Zoomen ausgelöst, exakt wie im
  Akzeptanzkriterium vorgesehen ("in dem Fall reicht die Hervorhebung der
  Zeile selbst").

### Regressionstest

Frischer Server/Tab: Zoom-Buttons (Zurücksetzen nach starkem Reinzoomen),
Unsicherheiten-Toggle (Namensspalte bleibt bei 220px, Balkenanzahl
unverändert 297), Modulwechsel zu Icicle (sauberer Teardown: `ganttReste:
0`, Icicle rendert normal mit 12 Kategorien) - keine Konsolenfehler.
Treemap/Sunburst/Circle Packing nicht erneut getestet, keine gemeinsam
genutzte Datei geändert.

---

## 2026-09-05 (11) – Gantt-Diagramm: Grundfunktionalität neu aufgebaut

**Betrifft:** `js/viz/ganttDiagramm.js` (komplett neu aufgebaute
Zeichenlogik, gleiche Modul-Schnittstelle `render/resize/destroy`). Farb-Import
aus `js/utils/kategorieFarben.js`. Nicht-Ziele eingehalten: Treemap, Sunburst,
Icicle, Circle Packing und `kategorieFarben.js` selbst unverändert; keine
Sidebar-Integration.

**Auftrag/Referenz:** aktueller Gantt-Tab zeigte unbeschriftete, unfarbige
Balken in kaskadenartiger Anordnung ohne Zeitachse/Namensspalte/Legende -
strukturell nicht vergleichbar mit dem alten Single-File-Interface-Gantt
(feste Namensspalte links, Zeitachse oben mit Jahreszahlen, Farbcodierung mit
Legende, chronologisch sortiert, Pan-/Zoom-Symbol "⟷").

### Schritt 1 - Root-Cause-Analyse (vor jeder Änderung durchgeführt)

Datei `ganttDiagramm.js` vollständig gelesen, drei explizit gestellte Fragen
beantwortet:

1. **Layout-Logik:** KEIN hierarchischer/verschachtelter Algorithmus (kein
   Icicle/Treemap-artiger Fehler). `zeichneBalken()` vergab bereits einen
   einfachen, sequenziellen y-Wert nach Listenindex
   (`translate(0, RAND.oben + i*(ZEILENHOEHE+ZEILENABSTAND))`). Die gemeldete
   "Kaskade" war stattdessen ein reines SORTIER-Artefakt:
   `teileNachZeitraum()` sortierte zuerst nach `kategorieVonKnoten(a)
   .localeCompare(...)`, erst DANACH nach `a.von - b.von` - das erzeugte 12
   separate, je in sich chronologisch aufsteigende Mini-Kaskaden (eine pro
   Kategorie, alphabetisch aneinandergereiht), übereinandergestapelt über
   eine >5600px hohe Liste. Live bestätigt: die x-Positionen der ersten acht
   gerenderten Balken (297,297,640,859,768,771,776,818) steigen lokal an und
   springen an Kategoriegrenzen zurück - exakt das Muster, das eine
   Kategorie-zuerst-Sortierung erzeugt.
2. **x-Skala:** existierte bereits (`d3.scaleLinear().domain(jahresSpanne)
   .range(...)`), Domain aus `d3.min(von)`/`d3.max(bis)` über alle Bestände
   mit auswertbarem Zeitraum - funktional korrekt, keine Neuimplementierung
   dieses Teils nötig.
3. **Datenquelle:** `baueBestandsHierarchie(data)` wurde bereits genutzt,
   keine eigenständige CSV-Lesung - `render()` erhält die Records wie alle
   anderen Module über `app.js`/`dataLoader.js`.

**Zwei zusätzliche, aus dem Code (nicht nur dem Screenshot) bestätigte
Fehler, die die übrigen Symptome erklären:**

- **"Unfarbig":** `farbeFuerKategorie()` nutzte `CAT_COLORS` aus
  `js/config/constants.js` - einer für `urkunden.csv`s "kategorien"-Spalte
  gedachten Platzhalterkonstante mit exakt einem Eintrag
  (`{default:'#888888'}`, Kommentar im Quellcode: "Platzhalter - vorläufige
  Werte"), NICHT `kategorieFarben.js` wie die anderen vier Module. Da kein
  `bkk_kategorie`-Name je als Key in `CAT_COLORS` vorkommt, fiel JEDER Balken
  auf `CAT_COLORS.default` zurück. Live empirisch bestätigt: alle 292 (später
  korrigiert: 297, siehe Datenkorrektur unten) gerenderten Balken hatten exakt
  `fill="#888888"`, keine einzige andere Farbe (`einzigartigeFarben:
  ["#888888", "#f4f4f4"]`, letzteres nur der Hintergrund des
  "Ohne Zeitangabe"-Kachelblocks).
- **"Ohne Zeitachse":** `zeichneZeitachse()` wurde tatsächlich aufgerufen,
  aber an der y-Position `hoeheZeitleiste` platziert - das ist die Höhe NACH
  allen Balkenzeilen (`RAND.oben + mitZeitraum.length *
  (ZEILENHOEHE+ZEILENABSTAND)`), also ganz UNTEN in einer >5600px hohen SVG.
  Live bestätigt: `svgWidthHeight.h = 5656`, ein `g.tick`-Element existierte
  zwar im DOM ("Achse mit Ticks vorhanden"), war aber ohne bis ans Ende zu
  scrollen praktisch unauffindbar - technisch vorhanden, praktisch nicht
  vorhanden.

### Datenkorrektur während der Analyse (wichtig für alle folgenden Zahlen)

Eine erste manuelle Auszählung von `data/bestandsverzeichnis.csv` (eigener
`fetch()` + `d3.dsvFormat(';').parse()` im Browser, NICHT über
`dataLoader.ladeCSV()`) ergab 329 Zeilen, davon 292 mit und 37 ohne
auswertbaren Zeitraum. Nach Implementierung wich die live im DOM gerenderte
Zeilenzahl (315 = 297 mit + 18 ohne Zeitraum) davon ab. Root-Cause-Check
dieser Diskrepanz (dieselbe Sorgfalt wie bei jedem anderen Bug in diesem
Projekt): `baueBestandsHierarchie()` selbst dedupliziert/filtert keine
Blätter (jeder Record wird 1:1 in die Kinder-Liste seiner
Kategorie/Unterkategorie gepusht, keine Map-Deduplizierung nach Name). Die
Abweichung lag stattdessen im MANUELLEN Test selbst: `dataLoader.ladeCSV()`
(über `entferneBOM()` + `d3.dsvFormat(';').parse()`) liefert unmittelbar
315 Records bei 0 gemeldeten Fehlern - dreifach cross-verifiziert (mit
robuster `charCodeAt(0)===0xfeff`-Prüfung, mit der ursprünglich verwendeten
Regex-Variante, und ganz ohne BOM-Behandlung: alle drei Varianten liefern
315, es liegt nachweislich gar kein BOM in der Datei vor,
`ersteZeichenCode: 110` = 'n' von "name"). Die frühere 329-Zählung stammte
aus einem alten Test-Tab/-Port in einer früheren Session-Phase (Icicle/Circle
Packing) und ist nicht reproduzierbar - vermutlich eine einmalige
Browser-Cache-Anomalie jenes Tabs, nicht ein Datei- oder Code-Fehler. Alle
folgenden Zahlen in diesem Eintrag beruhen auf der dreifach verifizierten,
über `dataLoader.ladeCSV()` (demselben Weg, den die App selbst nutzt)
ermittelten Zählung: **315 Bestände gesamt, 297 mit auswertbarem Zeitraum,
18 ohne**.

### Schritt 2-4 - Umsetzung

- **Namensspalte:** eigener DOM-Ast (`<div class="gantt-namensspalte">`),
  NIE Teil der Zeitachsen-SVG - "bleibt fix stehen" ergibt sich dadurch
  strukturell, ohne CSS-Sondertrick: der Zeitachsen-Zoom transformiert
  ausschließlich Attribute innerhalb der Zeitbereich-SVG, die Namensspalte
  wird davon nie berührt. Kürzung bei Platzmangel über natives CSS
  (`text-overflow: ellipsis; white-space: nowrap`) statt einer manuellen
  Zeichen-Zähl-Heuristik wie in den anderen Modulen - hier möglich, weil die
  Namensspalte reines HTML ist (nicht SVG `<text>`), pixelgenau statt
  geschätzt, konsistent mit dem etablierten Label-Fallback-Prinzip
  (verkürzt statt überlaufend, volle Angabe per Tooltip). Live verifiziert:
  `nameOverflow: "ellipsis", nameWhiteSpace: "nowrap"`.
- **Zeitachse:** `d3.axisTop()`, in einer eigenen `<div class="gantt-kopf-
  achse-bereich">` über der Bestandsliste, `position: sticky; top: 0` auf der
  gemeinsamen `.gantt-kopfzeile` - bleibt beim Scrollen der (langen)
  Bestandsliste sichtbar, exakt wie im alten Interface gefordert. Live
  verifiziert: `kopfzeileTop` blieb nach `window.scrollBy(0, 800)` bei `0`
  (vorher `251` bei scrollY=0) - Sticky-Verhalten bestätigt.
- **Sortierung:** ausschließlich nach `zeitraum_von` aufsteigend, KEINE
  Kategorie-Vorsortierung mehr (Root-Cause-Fix, siehe oben) - "Kategorien
  durchmischt" wie im alten Interface gefordert.
- **Farbcodierung:** `farbeFuerBlatt()` nutzt `kategorieVonKnoten()` +
  `kategorieFarbSkala` aus `baueKategorieFarbSkala(kategorienNamen)`
  (`kategorieFarben.js`, importiert, nicht dupliziert) - dieselbe Zuordnung
  wie Treemap/Sunburst/Icicle/Circle Packing. Bewusst OHNE
  Unterkategorie-Farbabstufung (anders als bei den vier anderen Modulen): der
  Auftrag verlangt eine Legende, die "alle vorkommenden Kategorien und ihre
  Farben" zeigt - ein 1:1-Verhältnis Kategorie→Farbe hält Legende und
  Balkenfarbe exakt deckungsgleich, eine zusätzliche
  Unterkategorie-Abstufung hätte Balkenfarben erzeugt, die die Legende nicht
  mehr vollständig erklärt. "Ohne Kategorie" erhält `OHNE_KATEGORIE_FARBE` +
  gepunktetes Muster in der Legende (CSS `repeating-linear-gradient` statt
  einer SVG-`<pattern>` - hier ausreichend, da die Legende reines HTML ist).
  Live verifiziert: alle 297 datierten Balken exakt farbgleich mit ihrem
  Legendeneintrag (`stimmtUeberein: 297, stimmtNicht: 0`); Legende enthält
  alle 11 tatsächlich vorkommenden `bkk_kategorie`-Werte plus "(ohne
  Kategorie)" (2 Bestände ohne Kategorie in den Rohdaten, beide OHNE
  auswertbaren Zeitraum, tauchen also korrekt unter den 18
  "ohne Zeitangabe"-Zeilen auf, nicht unter den 297 Balken - deshalb 0
  OHNE_KATEGORIE-Treffer unter den geprüften Balken, kein Fehler).
- **Beschriftung im Balken:** Zeitraum-Text (`"{von}–{bis}"`) mittig, nur
  wenn er hineinpasst (`text.length * (11*0.57) <= breite - 6`, dieselbe
  Kennzahl `0.57`, die treemap.js/sunburst.js/icicle.js/circlePacking.js
  bereits für ihre Auto-Fit-Beschriftung nutzen), sonst ausgeblendet -
  Vollinformation dann nur per Tooltip, der Zeitraum, Name und Kategorie
  explizit nennt (`baueGanttTooltipText()` erweitert `baueTooltipText()` -
  gemeinsam mit den anderen vier Modulen genutzt - um eine Zeitraum-Zeile,
  ohne dessen übrige Zeilen zu duplizieren). Live geprüft:
  `tooltipTextBalken: "Zeitraum: 1108–1781\nIngedenkbücher\nKategorie:
  Kultur\n..."`.
- **Mindestbalkenbreite (Schritt 4):** 24px, dieselbe Fitts'sches-Gesetz-
  Zielgröße wie `MINDESTBREITE_PX` (icicle.js/treemap.js) bzw.
  `MINDESTRADIUS_PX*2` (circlePacking.js). Verifiziert gegen die
  (korrigierten) echten Daten: bei einer realistischen Zeitachsenbreite von
  1148px (1400px Gesamtbreite - 220px Namensspalte - 32px Rand) über die
  volle Datumsspanne 1108-2024 (916 Jahre, ca. 1,25px/Jahr) liegen 91 von
  297 Beständen mit auswertbarem Zeitraum (30,6%) unter 24px, darunter 13 mit
  exakt nulljähriger Laufzeit (z.B. "Volkszählung 1824",
  von=bis=1824; "Stadt- und Landgerichts-Rechnungssammler", 1785-1785) - ohne
  Mindestbreite wären diese als 1px-Haarlinien praktisch unsichtbar und kaum
  fokussierbar gewesen. Da jeder Bestand seine EIGENE Zeile hat (anders als
  bei den anderen vier Modulen, wo Geschwister sich eine gemeinsame
  Achse/Fläche teilen), erzwingt `Math.max(xSkala(bis)-xSkala(von), 24)` pro
  Balken unabhängig, ohne andere Balken zu verdrängen - keine
  Wasserfüll-/Kollisionslogik nötig. Live verifiziert nach Fix:
  `minBreite: 24, unterMindestbreite24px: 0` über alle 297 Balken.

### Schritt 5 - Navigation: feste Namensspalte + Pan-/Zoom

**Gewählte Interaktion (mit Begründung, wie gefordert):** `d3.zoom()` auf der
Zeitbereich-SVG, aber NICHT per Gruppen-Transform (das hätte auch
Strichbreiten/Text verzerrt skaliert) - stattdessen wird bei jedem
`zoom`-Ereignis `event.transform.rescaleX(xSkalaBasis)` gebildet und diese
neue Skala genutzt, um Balken-x/-breite UND die Zeitachse (`d3.axisTop`) neu
zu berechnen (`aktualisierePositionen()`/`zeichneAchse()`, in beiden Fällen
dieselbe Funktion wie beim Erstaufbau - garantiert, dass Achse und Balken nie
auseinanderlaufen können).

- **Ziehen (Drag)** verschiebt die Zeitachse.
- **Mausrad/Trackpad-Pinch NUR mit gedrückter Strg-Taste** zoomt (Browser
  melden eine Trackpad-Pinch-Geste als Wheel-Event mit `ctrlKey=true` -
  dieselbe Konvention wie Figma/Google Maps). Begründung: einfaches Mausrad
  OHNE Strg wird bewusst NICHT abgefangen
  (`zoom.filter((event) => event.type==='wheel' ? event.ctrlKey : !event
  .button)` liefert dafür `false`, wodurch d3 kein `preventDefault()`
  auslöst) - das ist die direkte Umsetzung der in Schritt 5 explizit
  geforderten Eigenschaft "vertikales Scrollen bleibt unabhängig vom
  horizontalen Pan funktionsfähig": ohne diese Einschränkung würde JEDES
  Mausrad-Ereignis über dem Diagramm zoomen statt die Seite vertikal zu
  scrollen. Live verifiziert: einfaches `WheelEvent` (`ctrlKey:false`)
  ließ die Transformation unverändert (`k:1,x:0` vorher/nachher);
  `ctrlKey:true` löste sofort einen Zoom aus (`k:4`).
- **Drei Buttons** (−/⟷/+) für Tastatur- und Touch-Bedienung ohne
  Wheel/Drag, per `zoom.scaleBy`/`zoom.transform` auf derselben SVG-Auswahl
  angewendet.

**translateExtent/extent:** auf die TATSÄCHLICHE Pixelfläche der
Zeitbereich-SVG gesetzt (`[[0,0],[zeitbereichBreite, gesamtHoehe]]`) - ein
erster Testlauf mit einer künstlich auf 1px verengten Höhe (in der Annahme,
"wir brauchen ja nur x") hatte dazu geführt, dass Drag-Pan überhaupt nicht
mehr reagierte; mit der echten Höhe funktioniert Drag korrekt, ein
zugelassener y-Anteil der Transformation hat trotzdem keine sichtbare
Wirkung, da beim Neuzeichnen ausschließlich `rescaleX()` gelesen wird.

**Kein `.transition()` bei den Zoom-Buttons (Abweichung vom ersten Entwurf,
während des Testens korrigiert):** ursprünglich wendeten die Buttons die
Zoom-Änderung über `svg.transition().duration(200).call(...)` sanft
animiert an - das ist der offiziell dokumentierte d3-Zoom-Rezept-Ansatz.
Beim Testen im Browser-Automatisierungs-Tab reagierte KEINER der drei
Buttons (`k` blieb unverändert nach Klick). Root-Cause-Check: isolierter
Test von `requestAnimationFrame` in genau diesem Tab ergab `rafGefeuert:
false` (1,5s Timeout ohne Callback) - der Tab war zu diesem Zeitpunkt nicht
sichtbar/composited (derselbe Zustand, der zuvor bereits den
`computer{action:"screenshot"}`-Aufruf mit "Browser pane is not displayed"
hatte scheitern lassen). Da d3-Transitions über `d3-timer` auf
`requestAnimationFrame` beruhen, blieb JEDE transition-basierte Änderung in
diesem Zustand wirkungslos - unabhängig vom Modul, kein
gantt-spezifischer Fehler. Da dieses Verhalten (ein Tab, der zeitweise nicht
sichtbar/composited ist, z.B. ein Hintergrund-Tab beim Umschalten zwischen
Anwendungen) auch bei echten Nutzenden vorkommen kann, wurde die Animation
bewusst entfernt statt nur "im Test funktioniert es ja meistens" hinzunehmen:
die Buttons wenden die Transformation jetzt OHNE `.transition()` sofort an
(`svg.call(zoomVerhalten.scaleBy, 1.5)` statt
`svg.transition().call(...)`) - dadurch unabhängig von `requestAnimationFrame`
garantiert wirksam, auf Kosten der rein kosmetischen Ease-Animation. Nach
dieser Korrektur live verifiziert: drei aufeinanderfolgende Klicks
(rein, rein, raus, zurücksetzen) ergaben exakt die erwartete Sequenz
`k: 1→1.5→2.25→1.5→1` mit synchron mitgeführtem `x`.

**Weiterer während des Testens gefundener und behobener Fehler:**
`translateExtent`/`extent` waren im ersten Entwurf auf `[[0,0],[breite,1]]`
gesetzt (in der Annahme, die Höhe sei für reines x-Zoomen irrelevant) - das
hatte Drag-Pan bei JEDER Zoomstufe deaktiviert, nicht nur bei `k=1`. Isoliert
nachgestellt (Minimal-Testfall mit `d3.zoom()` auf einer frischen Test-SVG):
mit `extent`-Höhe gleich der Content-Höhe UND `k=1` ist Pan korrekt
mathematisch unmöglich (Content füllt die Extent-Fläche bereits exakt aus -
jede Verschiebung würde leeren Raum jenseits der `translateExtent`-Grenze
zeigen, was `d3.zoom()` per Definition verhindert); das war also bei `k=1`
KEIN Fehler, sondern korrektes, gewolltes Klemm-Verhalten (kein Scrollen über
die Datenränder hinaus). Der eigentliche Fehler war die 1px-Höhe selbst, die
Drag-Pan AUCH bei `k>1` blockierte, wo eigentlich Platz zum Verschieben
bestünde. Nach Korrektur auf die echte Höhe live verifiziert: nach
dreifachem Reinzoomen (`k=3.375`) verschob ein Drag von 150px die
Transformation exakt um -150px (`x: -1363.25 → -1513.25`); ein Drag über die
linke Datenkante hinaus (Übertreiben mit 2900px) klemmte korrekt bei `x=0`,
Achse zeigte weiterhin korrekt "1100" als ersten Tick, kein Bar
außerhalb der sichtbaren Fläche.

**Vertikales Scrollen unabhängig vom horizontalen Pan:** ergibt sich
strukturell aus der Kombination aus (a) normalem Seiten-Scroll (dieselbe
Konvention wie bei den anderen vier Modulen - keine eigene
`overflow-y:auto`-Zone) und (b) der Strg-Bedingung im Zoom-Filter oben - ein
einfaches Mausrad-Scrollen über dem Diagramm bewegt daher immer die Seite,
nie die Zeitachse.

### Schritt 6 - Fehlende Zeiträume

**18 von 315 Beständen (5,7%)** ohne auswertbaren Zeitraum (`zeitraum_von`
und/oder `zeitraum_bis` fehlt oder nicht als Zahl auswertbar; 0 Fälle mit
`von > bis`). Beispiele: "Passprotokolle", "Einzelne Pässe und
Passierscheine", "Handschriften, Manuskripte und Typoskripte" (eine der
beiden Bestände ohne Kategorie). Behandlung: anders als in der Vorversion
(separater grauer Kachel-Block unterhalb der Zeitachse, jede Kachel nur
14×14px ohne Namen sichtbar) jetzt als GLEICHWERTIGE Zeilen am Ende
derselben Liste - dieselbe Zeilenhöhe, derselbe Platz in der Namensspalte
(mit Name plus Badge "ohne Zeitangabe"), ein gestrichelter, NICHT von der
x-Skala/vom Zoom abhängiger Platzhalter statt eines Balkens (es gibt keine
Zeitposition, die man zoomen könnte) in der Kategoriefarbe des Bestands,
weiterhin fokussierbar und mit vollem Tooltip (`"Zeitraum: keine Angabe"`
plus Name/Kategorie/Unterkategorie/Umfang/Unsicher-Hinweis). Live
verifiziert: `ohneZeitraumMarker: 18`, `namenZeilen: 315` (297+18).

### Regressionstest

Frischer Server/Tab (nach Bereinigung von durch fehlerhafte eigene
Test-Dispatches - siehe unten - verursachtem Konsolen-Rauschen): Zoom-Buttons
(rein/rein/raus/zurücksetzen, exakte erwartete Sequenz), Drag-Pan (inkl.
Kantenklemmen), Strg+Wheel-Zoom vs. einfaches Wheel (kein Zoom), Sticky-Achse
beim Scrollen, Tastaturfokus + Tooltip auf Balken UND "ohne
Zeitangabe"-Markern, Unsicherheiten-Toggle (bewahrt Zoom-/Pan-Zustand
unverändert, `resize()` verletzt damit nicht den Modul-Vertrag "kein
Zurücksetzen des internen Zustands"), echtes Fenster-Resize (setzt
Zoom/Pan bewusst zurück, da die alte Transformation sich auf Pixelwerte der
alten Breite bezog - andere Breite macht sie ungültig), Modulwechsel zu
Sunburst (sauberer Teardown: `ganttReste: 0`, Sunburst rendert normal) -
keine echten Konsolenfehler in einem sauberen, frisch geöffneten Tab.
Treemap/Sunburst/Icicle/Circle Packing nicht erneut vollständig getestet -
keine gemeinsam genutzte Datei wurde geändert außer dem reinen Lesezugriff
auf bereits bestehende Exporte aus `kategorieFarben.js`/`bestandsHierarchie.js`.

**Nebenbefund beim Testen (kein Anwendungsfehler, hier dokumentiert):** ein
früherer Testlauf in einem länger wiederverwendeten Tab zeigte 2-4
Konsolenfehler ("Cannot read properties of null (reading 'document')").
Root-Cause-Check: dieser Fehler ließ sich gezielt reproduzieren, indem eine
`MouseEvent`-Sequenz OHNE das Feld `view: window` dispatcht wurde (in
mehreren frühen, inzwischen verworfenen Debug-Versuchen dieser Sitzung
verwendet) - d3-drag ruft intern `nodrag(event.view)` auf, was bei
`event.view === null` (wie es NUR bei einer unvollständig konstruierten
`MouseEvent` vorkommen kann, nie bei einer echten Nutzer-Interaktion) exakt
diesen Fehler wirft. In einem komplett frischen Tab, ausschließlich mit
nativen `.click()`/`.focus()`-Aufrufen (kein einziges manuell konstruiertes
`MouseEvent`), trat der Fehler kein einziges Mal auf - bestätigt, dass es
sich um ein Artefakt der eigenen Testmethode handelte, nicht um einen
Anwendungsfehler.

---

## 2026-09-05 (10) – Circle Packing: Kreise oben/unten abgeschnitten (radius()-Accessor-Bug)

**Betrifft:** `js/viz/circlePacking.js`. Kurzfassung in `CHANGELOG.md`, hier
die Herleitung und die konkreten Testwerte.

**Bug-Report des Auftraggebers (Root-Cause-Verdacht):** Circle Packing
berechne die Kreispositionen für eine Fläche, die nicht mit der tatsächlich
sichtbaren Höhe des Viz-Containers übereinstimme (sichtbar an mehreren
oben/unten abgeschnittenen Kreisen: "ohne Kategorie", zwei weitere
Kategorien oben, "Stadt und Raum" unten) - vermutet als Nachwirkung der
Vollbild-/Flexbox-Anpassung, bei der Circle Packing im Gegensatz zu
Treemap/Sunburst/Icicle die verfügbare Höhe nicht korrekt oder nicht
rechtzeitig auslese. Explizit erfragt: (1) nutzt `circlePacking.js`
`container.clientHeight` dynamisch, (2) wird `d3.pack().size(...)` mit den
tatsächlich im DOM verfügbaren Werten aufgerufen, (3) ist die `viewBox`
korrekt an die Containergröße gekoppelt.

**Root-Cause-Check (Schritt 1, aktiv geprüft) - Vermutung in der
vorgeschlagenen Form NICHT bestätigt, echte Ursache an anderer Stelle
gefunden:**

1. `clientHeight`-Lesung direkt mit treemap.js und icicle.js verglichen
   (grep über alle drei Dateien): alle drei lesen exakt nach demselben
   Muster `options.height || svgBereich.clientHeight || <Fallback>` in
   `zeichne…()`, also bei JEDEM Zeichnen frisch aus dem DOM, nicht nur beim
   ersten Aufruf. Kein Unterschied zwischen den Modulen - Punkt (1) und (2)
   der Nachfrage sind mit "ja, identisch zu den anderen drei Modulen" zu
   beantworten.
2. `viewBox` wird in `zeichneCirclePacking()` mit denselben `breite`/`hoehe`-
   Werten gesetzt wie `width`/`height` des SVG-Elements (`.attr('viewBox',
   \`0 0 ${breite} ${hoehe}\`)`) - keine Diskrepanz zwischen SVG-Attributen
   und viewBox, Punkt (3) der Nachfrage ebenfalls mit "korrekt gekoppelt" zu
   beantworten.
3. Da weder (1) noch (2) noch (3) den Fehler erklärten, wurde die einzige
   verbleibende geometrische Berechnung genauer untersucht:
   `packeMitMindestradius()`. Dort fiel auf: der ZWEITE `d3.pack()`-Aufruf
   (nur ausgeführt, wenn die Mindestradius-Korrektur überhaupt greift) gibt
   einen eigenen `.radius()`-Accessor an
   (`.radius((d) => Math.max(d.r, mindestRadius))`), um den 12px-
   Mindestradius durchzusetzen. Recherche in der d3-hierarchy-Dokumentation:
   "If the radius accessor is not null, the radius of each leaf circle is
   specified exactly by the function" - im Gegensatz zum Default-Fall ohne
   `.radius()`-Accessor ("the radii are then scaled proportionally to fit
   the layout's size"). Das bedeutet: sobald ein eigener `.radius()`-
   Accessor übergeben wird, überspringt `d3.pack()` die sonst automatische
   Nachskalierung der gesamten Packung auf `size([breite, hoehe])` komplett.

**Empirische Verifikation der Root-Cause-Hypothese (isolierter d3.pack()-
Test, VOR jeder Änderung am Code, echtes global geladenes `d3` im Browser):**
Testdaten (6 Knoten, Werte 100/80/60/5/3/1), Zielgröße `breite=900,
hoehe=300` (absichtlich breiter als hoch, wie ein typischer Viz-Container),
`mindestRadius=40` (absichtlich groß, um die Korrektur sicher auszulösen).
- Packung OHNE `.radius()`-Accessor: bbox `{minX:306.4, maxX:593.9,
  minY:40.0, maxY:296.4}` - vollständig innerhalb `[0,900]×[0,300]` ✓.
- Packung MIT `.radius()`-Accessor (Mindestradius-Korrektur, wie
  `packeMitMindestradius()` sie vor dem Fix aufrief): `wurzel.r = 177.15`
  (> `min(900,300)/2 = 150`), bbox `{minX:300.6, maxX:588.2, minY:-2.73,
  maxY:324.01}` - **außerhalb** `[0,300]` in y-Richtung, sowohl oben
  (negativ) als auch unten (>300). Exakt das gemeldete Symptom: Kreise oben
  UND unten abgeschnitten, da die Einhüllende bei `[breite/2, hoehe/2]`
  zentriert bleibt, aber nicht auf `min(breite,hoehe)` skaliert wird.

Root-Cause damit exakt bestätigt, bevor irgendeine Codeänderung vorgenommen
wurde.

**Architekturentscheidung (Fix):** Kein Eingriff in die Mindestradius-
Korrekturlogik selbst (Wasserfüll-artige `flaecheGeflossen >
verfuegbareFlaeche`-Bailout-Prüfung bleibt unverändert als grobe
Vorab-Heuristik) - stattdessen wird nach dem `.radius()`-Pack-Aufruf exakt
die Skalierung nachgeholt, die `d3.pack()` im Default-Fall selbst
durchführen würde: `faktor = Math.min(breite, hoehe) / (2 * wurzel.r)`,
angewendet auf JEDEN Knoten der Hierarchie (`wurzel.each(...)`) relativ zum
bereits korrekt zentrierten Wurzelpunkt (`x = wurzel.x + (x - wurzel.x) *
faktor`, ebenso für `y`, sowie `r *= faktor`). Eine gleichmäßige Skalierung
aller Positionen UND Radien um denselben Faktor relativ zu einem
gemeinsamen Zentrum erhält zwangsläufig alle paarweisen Abstände
proportional - Überlappungsfreiheit bleibt dadurch garantiert erhalten,
ohne sie erneut prüfen zu müssen.

**Bewusst in Kauf genommener Kompromiss (konsistent mit dem bereits
etablierten "rechnerisch unmöglich"-Prinzip):** Ist der erzwungene
Mindestradius mit der Einpassung in die Zielfläche gleichzeitig nicht
erfüllbar, gewinnt die Einpassung - der Faktor kann Radien wieder unter
`MINDESTRADIUS_PX` drücken. Kein Überlauf/Abschneiden wiegt schwerer als
eine punktuell leicht unterschrittene Fitts'sches-Gesetz-Zielgröße, exakt
dieselbe Priorisierung wie beim bestehenden Bailout weiter oben in
derselben Funktion.

**Verifikation nach dem Fix, wie vom Auftraggeber gefordert (mindestens
zwei Viewport-Größen, nicht nur eine Standardgröße):**

1. Derselbe isolierte d3.pack()-Test wie oben, jetzt mit der manuellen
   Nachskalierung ergänzt: `wurzelRNachFix = 150` (= `min(900,300)/2`,
   exakt der d3-eigene Ziel-Invariante), bbox `{minX:323.5, maxX:567.0,
   minY:20.7, maxY:297.3}` - vollständig innerhalb `[0,900]×[0,300]` ✓,
   0 Überlappungen zwischen den 6 Kreisen, kleinster Radius nach dem Fix
   33,87px (unter dem angeforderten Mindestradius 40px, aber korrekt
   eingepasst - siehe Kompromiss oben).
2. Live gegen echte Daten, Übersicht (12 Kategorien), Browser-Viewport
   1920×1080: SVG-Größe 1888×873px, 0 von 12 Kreisen außerhalb der
   Zielfläche.
3. Live gegen echte Daten, Übersicht, Browser-Viewport 1600×350 (deutlich
   flacher, um die Korrektur eher auszulösen): 0 von 12 Kreisen außerhalb
   der Zielfläche.
4. Live gegen echte Daten, Kategorie-Ansicht "Verwaltung" (62 Bestände),
   Canvas 1553×480: 0 von 62 Kreisen außerhalb der Zielfläche (Korrektur in
   diesem konkreten Datensatz bei dieser Größe allerdings nicht ausgelöst -
   kein Kreis unter dem Mindestradius, daher kein aussagekräftiger Test des
   Korrekturpfads selbst).
5. Um den Korrekturpfad GEZIELT und nachweislich zu durchlaufen (da die
   echten Daten bei den getesteten Fenstergrößen dafür nicht klein genug
   wurden), wurde das echte, unveränderte Modul per dynamischem `import()`
   im Browser mit synthetischen Extremdaten (1 großer Bestand, Wert 500,
   plus 40 sehr kleine Bestände, Wert je 0,01, alle in einer Kategorie) auf
   einem absichtlich sehr niedrigen Canvas (1600×200) gerendert und in die
   Kategorie-Ansicht gezoomt: 40 der 41 Kreise fielen unter den
   12px-Mindestradius (r≈9,08px) - die Korrektur griff also nachweislich,
   mit dem erwarteten, dokumentierten Kompromiss (Einpassung vor
   Mindestradius) - UND: 0 von 41 Kreisen lagen außerhalb der Zielfläche
   1600×200. Dies ist der stärkste Beleg, da genau der Codepfad geprüft
   wurde, der vor dem Fix nachweislich überlief.

**Nebenbefund beim Testen (kein Fehler, nur dokumentiert):** Der
dynamische `import()`-Testaufruf in Punkt 5 nutzte denselben
Modul-Singleton (`instanz`-Variable im Closure von `circlePacking.js`) wie
die zeitgleich im selben Tab laufende echte App-Instanz - `render()` auf
einem Test-Container hat dadurch kurzzeitig die echte, sichtbare
App-Instanz überschrieben/entkoppelt. Das ist ein Artefakt der gewählten
Testmethode (zwei `render()`-Aufrufe auf demselben Modul-Objekt im selben
Tab), keine Schwachstelle der App selbst (ein normaler Nutzungsablauf über
`app.js` ruft `render()` pro Modul nur einmal pro Seitenladung auf) - nach
einem Seiten-Reload war der reguläre App-Zustand wieder sauber herstellbar,
alle nachfolgenden Regressionstests liefen auf einer frisch geladenen
Seite.

**Regressionstest** (frischer Server/Tab, echte Daten, nach Seiten-Reload):
Klick auf Kategorie-Kreis "Verwaltung" zoomt korrekt in die Kategorie-
Ansicht (62 Bestand-Kreise). Klick auf einen Bestand-Kreis öffnet die
Sidebar (`bestand-sidebar offen`); erneuter Klick auf denselben Kreis
schließt sie wieder (Toggle, Klasse wieder `bestand-sidebar` ohne
`offen`). "← Alle Kategorien"-Button springt korrekt zurück (12
Kategorie-Kreise wiederhergestellt, Button danach selbst wieder
ausgeblendet). Unsicherheiten-Toggle-Button über `resize()` (Klick auf
"Unsicherheiten anzeigen"/"ausblenden") ändert die Kategorienanzahl nicht
(weiterhin 12) - Navigation bleibt erhalten. Konsole: ein einzelner 404
stammt nachweislich aus einem eigenen, fehlerhaften Test-Fetch-Aufruf
(`/data/bestaende.json`, falscher Pfad) - kein echter App-Fehler.
Treemap/Sunburst/Icicle nicht erneut getestet - `circlePacking.js` ist das
einzige geänderte Modul, `bestandsHierarchie.js` und `kategorieFarben.js`
wurden nicht angefasst, ein Seiteneffekt auf andere Visualisierungen ist
damit ausgeschlossen.

---

## 2026-09-05 (9) – Icicle: Hierarchische Mindestbreiten-Korrektur (Verschachtelungs-Bug)

**Betrifft:** `js/viz/icicle.js`. Kurzfassung in `CHANGELOG.md`. Dieser
Eintrag korrigiert einen Fehler, dessen Verifikation in (8) unvollständig
war: dort wurde pro Zeile nur auf "keine Lücken/Überlappungen innerhalb der
Zeile" geprüft, nicht auf Verschachtelung ZWISCHEN den Zeilen.

**Bug-Report des Auftraggebers (Root-Cause-Verdacht per Screenshot):** Die
in (8) eingeführte pro-Zeile-Mindestbreiten-Korrektur verletze die
Verschachtelungseigenschaft des Partition-Layouts - Unterkategorie- und
Einzelbestand-Kacheln lägen dadurch nicht mehr exakt innerhalb der
x0/x1-Spanne ihrer übergeordneten Kategorie-Kachel aus Zeile 1. Sichtbar am
Übergang "Vermögen und Finanzen"/"Verwaltung": Verschiebung der
Kategoriegrenze zwischen den drei Zeilen um mehrere hundert Pixel. Der
Auftraggeber verlangte explizit eine hierarchische statt drei parallele,
unabhängige Korrekturen, sowie eine pixelgenaue Verifikation an mindestens
zwei Kategoriegrenzen (nicht nur "keine Lücken innerhalb der Zeile").

**Root-Cause-Check, aktiv geprüft:** `zeichneIcicle()` erneut gelesen.
Bestätigt exakt wie vom Auftraggeber vermutet: `korrigiereBreiteFuerGeschwister()`
wurde dreimal unabhängig aufgerufen - einmal auf `wurzel.children`
(Kategorie), einmal auf `wurzel.descendants().filter(d => d.depth === 2)`
(Unterkategorie, sortiert), einmal auf `wurzel.leaves()` (Bestand,
sortiert) - jedes Mal als EINE flache, globale Gruppe über die volle
Canvas-Breite `[0, breite]`, ohne jede Kenntnis davon, wo die Zeile darüber
nach ihrer eigenen Korrektur tatsächlich liegt. Da `d3.partition()` alle
Tiefen in einem gemeinsamen Aufruf konsistent verschachtelt berechnet,
diese Verschachtelung aber durch drei nachträgliche, voneinander
unabhängige Korrekturen zerstört wird, sobald irgendeine Zeile tatsächlich
korrigiert werden muss (was hier der Fall ist - siehe (8): 6 von 12
Kategorien, 22 von 26 Unterkategorien wurden auf 24px fixiert), war die
Diagnose des Auftraggebers exakt zutreffend.

**Architekturentscheidung (Fix):** Die bewährte Wasserfüll-Korrekturlogik
in `korrigiereBreiteFuerGeschwister()` (identisch zum in Treemap/Sunburst/
Circle Packing etablierten Muster inkl. "rechnerisch unmöglich"-Bailout)
bleibt inhaltlich UNVERÄNDERT - sie ist bereits korrekt für eine einzelne,
in sich geschlossene Geschwistergruppe. Der Fehler lag ausschließlich im
Aufrufmuster (global pro Zeile statt lokal pro Elternteil). Zwei neue
Hilfsfunktionen kapseln die Korrektur:

- `skaliereNachkommenX(elternKnoten, altX0, altX1)`: reskaliert linear ALLE
  Nachfahren (beliebiger Tiefe, über `d3.hierarchy`s `.each()`) eines
  Knotens von dessen VOR der Korrektur gültigen Spanne `[altX0, altX1]` in
  dessen NACH der Korrektur gültige, tatsächliche Spanne `[x0, x1]`.
- `korrigierePropagiertProElternteil(elternKnotenListe, mindestBreite)`:
  läuft über eine Liste von Elternknoten, ruft für JEDEN Elternteil
  `korrigiereBreiteFuerGeschwister()` NUR auf dessen eigene `children` auf
  (statt auf eine globale, elternübergreifende Liste) und propagiert jede
  dadurch entstandene Verschiebung sofort per `skaliereNachkommenX()` auf
  die jeweiligen Enkelknoten weiter, bevor die nächste Zeile berechnet
  wird. Rückgabewert ist die flache Liste aller korrigierten Kinder über
  alle Elternteile hinweg - direkt als Eingabe für den nächsten
  Hierarchie-Schritt verwendbar.

Der Aufruf in `zeichneIcicle()` (Ebene 1) wird dadurch zu einer sauberen,
durchgehenden Kette: `korrigierePropagiertProElternteil([wurzel], …)` für
die Kategorie-Zeile (die Wurzel als einziger "Elternteil" reproduziert
dabei exakt die bisherige globale Korrektur, da alle Kategorien ohnehin
die volle Wurzelspanne `[0, breite]` teilen - kein Sonderfall nötig),
gefolgt von zwei weiteren Aufrufen mit dem jeweiligen Vorzeilen-Ergebnis
als Eingabe für Unterkategorie und Bestand. Die bisherigen manuellen
`.sort((a,b) => a.x0-b.x0)`-Aufrufe für Unterkategorie/Bestand entfallen,
da die Iteration über `children` je Elternteil x0-aufsteigende Ordnung
bereits garantiert.

**Ebene 2 (Kategorie-Ansicht) bewusst unverändert:** Dort steht über der
Bestand-Zeile nur ein einziger gezeichneter "Elternteil" (das eine
Breadcrumb-Segment über die volle Canvas-Breite) - eine globale Korrektur
der Bestand-Zeile kann dort keine Verschachtelung zu einem falschen
Elternteil verletzen, da es nur einen gibt. Keine Änderung an dieser Zeile
nötig oder vorgenommen.

**Selbst gefundener, vor dem Test korrigierter Fehler:** Beim ersten Edit
landeten die beiden neuen Funktionen versehentlich VOR
`korrigiereBreiteFuerGeschwister()`, wodurch deren ursprünglicher
Erklärkommentar ("Post-Layout-Korrektur … RECHNERISCH UNMÖGLICHER FALL …")
über der falschen Funktion (`skaliereNachkommenX`) stehen blieb. Beim
eigenen Review vor dem Testlauf bemerkt und korrigiert (Kommentar wieder
direkt über die eigene Funktion verschoben, neue Funktionen samt eigener
Kommentare danach einsortiert) - kein inhaltlicher Fehler, aber eine
irreführende Dokumentation, die den nächsten Lesenden in die Irre geführt
hätte.

**Verifikation (exakt nach der vom Auftraggeber vorgegebenen Methode, nicht
die in (8) verwendete, hier ausdrücklich als unzureichend benannte
"keine Lücken innerhalb der Zeile"-Prüfung):** Für jede Unterkategorie- und
jede Bestand-Kachel wurde per `d.ancestors().find(a => a.depth === 1)` die
zugehörige Kategorie aufgelöst und geprüft, ob
`d.x0 >= katKnoten.x0 - EPS && d.x1 <= katKnoten.x1 + EPS` (EPS = 0,05px)
gilt. Ergebnis, live gegen die echten Daten (1000×900, frischer
Server/Tab): 0 von 26 Unterkategorie-Verletzungen, 0 von 315
Bestand-Verletzungen - geprüft gegen ALLE 12 gerenderten Kategoriegrenzen,
nicht nur die im Screenshot gezeigte.

Explizit an den vom Auftraggeber genannten und einer weiteren Grenze
pixelgenau bestätigt:
- "Vermögen und Finanzen" (x0=0, x1=396.72528076831026) /
  "Verwaltung" (x0=396.72528076831026, x1=650.9693780254155): x1 der
  ersten Kategorie == x0 der zweiten, exakt kontiguierlich, keine
  Verschiebung mehr. Letzte Unterkategorie unter "Vermögen und Finanzen"
  ("Privatvermögen", x1=396.72528076831026) und letzter Bestand darunter
  ("Repertorium über Verlassenschaftsabhandlungen", x1=396.7252807683102)
  enden exakt auf derselben Kante; erste Unterkategorie
  ("Kommunale Verwaltung") und erster Bestand ("Aktenbestand") unter
  "Verwaltung" beginnen exakt bei x0=396.72528076831026.
- "Stadt und Raum" (x1=823.9999999999995) / "Wirtschaft"
  (x0=823.9999999999995): ebenfalls exakt kontiguierlich; letzte
  Unterkategorie unter "Stadt und Raum" ("Stadt und Umland",
  x1=823.9999999999994) und erste Unterkategorie unter "Wirtschaft"
  ("Handel, Gewerbe und Handwerk", x0=823.9999999999995) treffen sich auf
  derselben Kante (Differenz < 0,0001px, reine Gleitkomma-Rundung).

**Regressionstest** (derselbe frische Server/Tab, echte Daten, 1000×900,
keine Konsolenfehler zu keinem Zeitpunkt): Klick auf eine
Kategorie-Kachel ("Verwaltung") zoomt korrekt in Ebene 2 (Breadcrumb +
genau eine Bestand-Zeile mit 62 Kacheln, Unterkategorie-Zeile korrekt
verschwunden). Klick auf das Breadcrumb-Segment springt korrekt zurück
nach Ebene 1 (alle drei Zeilen korrekt wiederhergestellt: Kategorie=12,
Unterkategorie=26, Bestand=315). `resize`-Event verändert die
Kategorienanzahl nicht (12 vor/nach). Treemap/Sunburst/Circle Packing
nicht erneut getestet - `icicle.js` ist das einzige geänderte Modul, keine
gemeinsam genutzte Funktion (`bestandsHierarchie.js` o.ä.) wurde
angefasst, ein Seiteneffekt auf andere Visualisierungen ist damit
ausgeschlossen.

---

## 2026-09-05 (8) – Icicle: Rückkehr zur 3-Ebenen-Ansicht mit Zoom-Verhalten

**Betrifft:** `js/viz/icicle.js`. Kurzfassung in `CHANGELOG.md`, hier die
Herleitung der Architekturentscheidungen und ein während der Umsetzung
gefundener, vor dem ersten Test korrigierter Fehler.

**Root-Cause-Check (Schritt 1), aktiv geprüft.** `bestandsHierarchie.js`
gelesen: `baueBestandsHierarchie()` liefert bereits Gesamtbestand → Kategorie
→ Unterkategorie → Bestand vollständig, unabhängig davon, wie viele dieser
Ebenen ein aufrufendes Modul tatsächlich zeichnet. `icicle.js` nutzte diese
Struktur schon (für die Unterkategorie-Farbabstufung der Bestand-Zeile),
zeichnete aber bisher nur Tiefe 1 (Kategorie) und Tiefe 3 (Bestand) als
Zeilen. Keine Erweiterung von `bestandsHierarchie.js` nötig - die fehlende
Tiefe-2-Zeile war rein eine Frage, ob `icicle.js` sie RENDERT, nicht ob die
Daten dafür vorhanden sind.

**Warum die drei Zeilen einfach nebeneinander bestehen können, ohne
Kaskaden-Neuzuordnung (anders als das bei der Sunburst/Circle-Packing-Etappe
nötig gewesen wäre).** `d3.partition()` berechnet x0/x1 für JEDE Tiefe in
einem einzigen Aufruf, bereits korrekt proportional durch alle
Zwischenebenen hindurch (dieselbe bereits mehrfach bestätigte Eigenschaft
aus den Sunburst-/Circle-Packing-Etappen). Da Icicle NUR die Y-Position
(Zeilen-Zuordnung) überschreibt, nicht die X-Breite, können alle drei Tiefen
GLEICHZEITIG mit ihren jeweils schon korrekt berechneten Breiten gezeichnet
werden, ohne dass eine Ebene der anderen "im Weg steht" - das ist genau der
im Auftrag genannte geometrische Unterschied zu Treemap (2D-Fläche),
Sunburst (Radius-Ring) und Circle Packing (2D-Kreisfläche), wo eine
zusätzliche Ebene tatsächlich um denselben Platz konkurriert hätte.

**Wichtige Absicherung, VOR dem ersten Test eingebaut (nicht als Reaktion
auf einen gefundenen Fehler):** `korrigiereBreiteFuerGeschwister()` setzt
voraus, dass die übergebene Knotenliste nach `x0` aufsteigend sortiert ist
(das erste/letzte Element bestimmt die Gesamtspanne für die
Machbarkeitsprüfung). Für `wurzel.children` (Kategorie-Zeile) ist das
strukturell garantiert (d3.partition() platziert Kinder in Array-
Reihenfolge). Für `wurzel.descendants().filter(d => d.depth === 2)`
(Unterkategorie-Zeile) und `wurzel.leaves()` (Bestand-Zeile) war die
GARANTIE für die exakte Traversierungsreihenfolge nicht mit Sicherheit
bekannt (`.descendants()`s dokumentierte Reihenfolge unterscheidet sich von
der breadth-first-Reihenfolge von `.each()`, ohne dass zweifelsfrei geklärt
war, ob eine Tiefen-Filterung sie zufällig doch x0-aufsteigend liefert).
Statt diese Unsicherheit stillschweigend zu übernehmen: beide Zeilen
zusätzlich explizit mit `.sort((a, b) => a.x0 - b.x0)` sortiert - kostet
nichts, macht eine Kernvoraussetzung des Korrektur-Algorithmus zur
Gewissheit statt zur Annahme. Live danach verifiziert: alle drei Zeilen
tilen exakt 968px mit 0 Lücken und 0 Überlappungen - bestätigt, dass die
Sortierung korrekt greift (unabhängig davon, ob sie im konkreten Fall nötig
gewesen wäre).

**Ein während der Umsetzung entdeckter, vor dem ersten Test selbst
korrigierter Fehler:** In der ursprünglichen Fassung der vereinheitlichten
Zeichenfunktion wurde die Auswahl-/Unsicher-Kennzeichnung an
`art === 'bestand-auswahl'` geknüpft - dieser String wurde aber nirgends
tatsächlich gesetzt (Ebene 1 nutzte `art: 'bestand'`, Ebene 2 ebenfalls
`art: 'bestand'`, beide unterschieden sich nur über `klick`). Beim
Gegenlesen des eigenen Codes vor dem ersten Testlauf bemerkt (nicht durch
einen fehlgeschlagenen Test aufgedeckt) - behoben durch Umstellung der
Bedingung auf `klick === 'waehlen'`, was ohnehin die semantisch korrekte
Unterscheidung ist (Auswahl/Sidebar existiert nur dort, wo ein Klick
tatsächlich auswählt, nicht wo er zoomt).

**Einheitliche Zeichenfunktion statt vier getrennter Blöcke.** Eine
gemeinsame Funktion für alle vier Kachel-Arten (Kategorie/Unterkategorie/
Bestand/Breadcrumb), parametrisiert über zwei unabhängige Achsen: `art`
(bestimmt Farbe/Beschriftung/Tooltip-Inhalt) und `klick`
(`'zoomen'`/`'waehlen'`/`'zurueck'`, bestimmt das Interaktionsverhalten).
Das erlaubt genau die im Auftrag verlangte Entkopplung: Ebene 1s
Bestand-Zeile nutzt dieselbe Farb-/Tooltip-Logik wie Ebene 2s Bestand-Zeile
(`art: 'bestand'`), aber unterschiedliches Klickverhalten (`'zoomen'` vs.
`'waehlen'`) - ohne die Logik zu duplizieren.

**Kategorie-Auflösung für den einheitlichen Zoom-Klick (Schritt 3).**
`kategorieDatenVonKnoten(d)` läuft über `d.ancestors().find(v => v.depth
=== 1)` - funktioniert unverändert für Kategorie- (Tiefe 1, liefert sich
selbst), Unterkategorie- (Tiefe 2) und Bestand-Knoten (Tiefe 3), da
`d.ancestors()` bei JEDEM Knoten beginnend nach oben bis zur Wurzel läuft.
Dieselbe robuste, tiefenunabhängige Technik wie `bestandsHierarchie.js`s
`kategorieVonKnoten()` (dort nur der Name, hier die vollen Daten, da
`wechsleZuKategorie()` ein `{name, children}`-Objekt erwartet).

**Farbe der neuen Unterkategorie-Zeile.** `farbeFuerUnterkategorie()` aus
`kategorieFarben.js` wurde bisher nur für die FEINABSTUFUNG von Bestand-
Blättern aufgerufen (mit der jeweiligen Unterkategorie als zweitem Argument,
über `bestandKnoten.parent`). Für die neue Zeile wird dieselbe Funktion
jetzt DIREKT auf den Unterkategorie-Knoten selbst angewendet
(`faerbeUnterkategorieSegment()`) - der Knoten hat bereits exakt die von der
Funktion erwartete Form (`.parent` ist die Kategorie, `.parent.children`
sind die Geschwister-Unterkategorien, dieselbe Struktur, die die Funktion
für die Sibling-Index-Berechnung braucht) - keine Änderung an
`kategorieFarben.js` nötig, reine Wiederverwendung.

**Verifikation (frischer Server/Tab, echte Daten, 1000×900):**
- Alle drei Zeilen der Übersicht: 12/26/315 Kacheln (Kategorie/
  Unterkategorie/Bestand), jeweils exakt 968px Gesamtbreite, 0
  Überlappungen, 0 Lücken.
- Farbcodierung: alle 12 Kategorie-Farben identisch zu den bereits in
  Treemap/Sunburst/Circle-Packing bestätigten Werten; "(ohne Kategorie)"
  propagiert `#8a8a8a` + Punktmuster korrekt sowohl auf ihre Unterkategorie
  ("(ohne Unterkategorie)") als auch auf ihre Bestand-Kacheln.
- Mindestbreiten-Korrektur: Kategorie-Zeile 6/12 auf 24px fixiert,
  Unterkategorie-Zeile 22/26 auf 24px fixiert (beide rechnerisch möglich,
  Korrektur griff), Bestand-Zeile korrekt UNKORRIGIERT (315 × 24px = 7560px
  vs. 968px verfügbar - ca. 7,8-fach zu viel, kleinste Kachel bleibt bei
  1,09px) - exakt der im Auftrag als "erwartetes, bereits akzeptiertes
  Verhalten" benannte Fall.
- Klick-Verhalten: Klick auf eine Unterkategorie-Kachel unter "Verwaltung"
  öffnet Breadcrumb "← Verwaltung" mit 62 Bestand-Kacheln (Kategorie-/
  Unterkategorie-Zeile korrekt auf 0 reduziert); Klick auf eine Bestand-
  Kachel unter "Kultur" in Ebene 1 öffnet ebenso korrekt Breadcrumb "←
  Kultur" (9 Bestände) OHNE die Sidebar zu öffnen - bestätigt, dass Ebene-1-
  Klicks auf JEDER Zeile ausschließlich zoomen, nie direkt auswählen.
- Ebene 2: Bestand-Klick öffnet Sidebar (Titel korrekt), erneuter Klick auf
  dieselbe, live abgefragte Kachel schließt sie und setzt den Fokus korrekt
  auf `.icicle-svg-bereich` (kein Verwaisen auf `<body>`).
- Tooltip auf allen drei Zeilen der Übersicht per Fokus-Ereignis geprüft:
  Kategorie `"Vermögen und Finanzen (142 Bestände)"`, Unterkategorie
  `"Öffentliches Vermögen (Kategorie: Vermögen und Finanzen, 137
  Bestände)"`, Bestand die volle `baueTooltipText()`-Ausgabe (Name,
  Kategorie, Unterkategorie, Umfang).
- Unsicherheiten-Toggle über `resize()`: alle drei Zeilen bleiben nach dem
  Umschalten unverändert bestehen (12/26/315). `resize()` (500×400 korrekt
  übernommen, alle drei Zeilen bleiben bestehen) und `destroy()`
  (Container vollständig geleert) geprüft.
- Tastaturfokus: Standard-Fokusrahmen bleibt für Icicle-Kacheln aktiv,
  NICHT unterdrückt (`outlineSuppressed: false` nach `.focus()`) - bestätigt
  unverändert gegenüber der vorherigen Etappe, wie im Auftrag verlangt
  ("bei Icicle unproblematisch, da rechteckig").
- Regressions-Gegenprüfung: Treemap (12 Kategorie-Gruppen), Sunburst (12
  Segmente, ein Ring), Circle Packing (12 Kreise, flache Packung) - alle
  drei unverändert beim 2-Ebenen-Modell, keine versehentliche Übertragung
  des neuen 3-Ebenen-Verhaltens.
- Keine Konsolenfehler auf jeder getesteten Seite/Aktion.

---

## 2026-09-05 (7) – Icicle und Circle Packing: Farben, Interaktivität, Sidebar

**Betrifft:** `js/viz/icicle.js`, `js/viz/circlePacking.js`. Kurzfassung in
`CHANGELOG.md`, hier die Herleitung der beiden modulspezifischen
Architekturentscheidungen (Icicle-Rücksprung, Circle-Packing-Flachpackung)
und der konkreten Verifikationen.

**Schritt 1 - Root-Cause-Check, aktiv geprüft statt zufällig entdeckt (wie
im Auftrag verlangt).** Beide Dateien VOR jeder Umsetzung gelesen: beide
riefen `baueBestandsHierarchie(data)` ohne zweiten Parameter auf - fielen
auf `MINDESTGROESSE = 10` zurück. Behoben durch denselben `0,05`-Wert wie
in `treemap.js`/`sunburst.js` (`MINDESTGROESSE_ROH_ICICLE`/
`MINDESTGROESSE_ROH_CIRCLEPACKING`, modul-lokale Konstanten, kein Import
eines gemeinsamen Werts - dieselbe bewusste Entscheidung wie bei den
vorherigen beiden Modulen, damit jedes Modul seinen eigenen Wert unabhängig
anpassen könnte, auch wenn er aktuell überall identisch ist).

**Icicle - Layout-Entscheidung, aus dem Auftragstext hergeleitet.** Der
Auftrag beschreibt einerseits "Ebene-1-Kategorien als oberste Zeile,
Ebene-2-Bestände als Zeile darunter" (suggeriert zwei GLEICHZEITIG
sichtbare Zeilen, klassisches Icicle-Muster) und andererseits explizit
"2-Zustands-Wechsel wie bei Treemap/Sunburst" (suggeriert nur EINE
sichtbare Ebene pro Zustand, wie die beiden Vorgänger-Module). Beide
Anforderungen gemeinsam erfüllt durch: Übersicht zeigt NUR die obere Zeile
(Kategorien); Kategorie-Ansicht zeigt BEIDE Zeilen - die obere aber nicht
mehr mit den einzelnen Kategorien, sondern mit einem EINZIGEN, vollbreiten
Segment für die AKTUELLE Kategorie (Breadcrumb), die untere mit deren
Beständen. Das erfüllt "zwei Zeilen sichtbar, wenn gezoomt" UND "nur zwei
Navigationszustände" (kein dritter Zwischenzustand, keine tiefere
Verschachtelung) gleichzeitig - UND beantwortet nebenbei die im Auftrag
gestellte Rücksprung-Frage: die obere Zeile (jetzt das Breadcrumb-Segment)
ist selbst das Rücksprung-Ziel, exakt wie im Auftrag als Option vorgeschlagen
("Klick auf die obere Zeile selbst").

**Icicle - Mindestbreiten-Korrektur, strukturell von sunburst.js
übernommen.** `korrigiereBreiteFuerGeschwister()` ist praktisch identisch zu
`sunburst.js`s `korrigiereWinkelFuerGeschwister()` (Wasserfüllungsverfahren:
zu kleine Segmente zuerst auf die Mindestgröße fixiert, Defizit anteilig von
den verbleibenden Geschwistern abgezogen, iterativ bis stabil; rechnerisch
unmöglicher Fall → keine Korrektur) - der einzige Unterschied: Icicle
rechnet direkt in Pixeln (`d3.partition()` liefert x0/x1 bereits in Pixeln),
keine Radius-zu-Bogenlänge-Umrechnung wie bei Sunburst nötig. Dieselbe
1D-Intervall-Garantie von `d3.partition()` gilt strukturell identisch.

Bei der Verifikation zunächst ein scheinbar überraschendes Ergebnis: Bei
"Verwaltung" (62 Bestände) auf dem vollen Canvas (968px) blieb das
kleinste Segment bei nur 5,3px - keine Korrektur griff. Nachgerechnet statt
als Bug angenommen: 62 × 24px = 1488px > 968px verfügbar - rechnerisch
TATSÄCHLICH unmöglich, korrekt gemäß der etablierten Regel unkorrigiert
gelassen. Unterschied zu Sunburst, wo dieselbe Kategorie (62 Bestände) SEHR
WOHL korrigierbar war (benötigte nur 87-98° von 360° verfügbaren Grad) -
der Grund: Sunburst's Budget ist immer 360° unabhängig von der
Containergröße, Icicle's Budget ist die tatsächliche Pixelbreite des
Canvas, die bei typischen Bildschirmgrößen sehr viel schneller erschöpft
ist. Mit einer kleineren Kategorie ("Bevölkerung und Bevölkerungsgruppen",
29 Bestände) griff die Korrektur dagegen korrekt (18 von 29 exakt auf
24px, 0 verbleibend darunter, Gesamtbreite weiterhin exakt 968px) - beide
Pfade (Erfolg UND korrekter Bailout) damit am echten Datensatz bestätigt,
nicht nur der Bailout-Pfad.

**Circle Packing - die zentrale strukturelle Herausforderung, vorab
durchdacht (nicht während der Umsetzung entdeckt).** Anders als bei
Treemap (1D-Höhenkorrektur genügt) und Sunburst (1D-Radius-Neuzuordnung
genügt) lässt sich bei `d3.pack()` eine Zwischenebene NICHT einfach
"unsichtbar machen": Ein Blatt-Kreis liegt in der VERSCHACHTELTEN
Baumstruktur immer INNERHALB des Kreises seines Eltern-Knotens (hier: der
nicht gezeichneten Unterkategorie) - selbst wenn man nur die Blätter
zeichnet, würden sie den Platz ihres (unsichtbaren) Unterkategorie-
Elternkreises nicht überschreiten, nicht die volle verfügbare Fläche der
ganzen Kategorie-Ansicht nutzen. Deshalb: für die Kategorie-Ansicht wird
eine EIGENE, FLACHE Hilfshierarchie aus den Bestand-Blättern gebaut
(`baueFlacheBestaende()`) - `{name: kategorieName, children: [...alle
Bestand-Blätter direkt]}`, OHNE die Unterkategorie-Zwischenebene. Die
Unterkategorie-Farbabstufung (die genau diese Zwischenebene braucht, siehe
`farbeFuerUnterkategorie()`) wird VORHER aus der echten, verschachtelten
Hierarchie berechnet und pro `record` in einer `Map` festgehalten, bevor
die flache Struktur gebaut wird - dieselbe Farblogik, nur zeitlich
vorgezogen statt zur Render-Zeit über `bestandKnoten.parent` abgerufen (wie
bei Treemap/Sunburst). Für die ÜBERSICHT (Kategorie-Ebene) ist diese
Flach-Konstruktion NICHT nötig: Ein Kategorie-Kreis ist selbst der oberste
gezeichnete Knoten, sein Radius hängt nur von seinem EIGENEN summierten
Wert ab, unabhängig davon, wie viele nicht gezeichnete Nachkommen-Ebenen
darunter existieren - hier genügt es, aus der vollen, verschachtelten
Hierarchie zu packen und nur `wurzel.children` (Tiefe 1) zu zeichnen,
exakt wie bei Treemap/Sunburst.

**Circle Packing - Rücksprung-Mechanismus, begründet.** Externer "← Alle
Kategorien"-Button in einer eigenen Werkzeugleiste (`baueWerkzeugleiste()`/
`aktualisiereWerkzeugleiste()`, wörtlich dieselbe Struktur wie
`treemap.js`). Bewusst NICHT Sunburst's Zentrum-Ansatz übernommen: Ein
Sunburst hat durch seine radiale Form einen natürlichen, IMMER freien
Mittelpunkt (den `INNERER_RADIUS`-Hub); eine Kreispackung hat keinen
analogen, garantiert freien Bereich - die Kreise können irgendwo im Canvas
liegen, ein "Klick in die Mitte" wäre nicht zuverlässig als leerer Bereich
vorhersagbar und müsste künstlich freigehalten werden (eine neue, an keiner
Stelle des Projekts bisher nötige Einschränkung der Packung). Der externe
Button ist dagegen die bereits an `treemap.js` erprobte, garantiert
konfliktfreie Lösung.

**Größenkodierung, explizit gegengeprüft statt nur behauptet (wie im
Auftrag verlangt).** Reasoning: `d3.pack()` setzt Fläche linear zum
übergebenen `.value` (nach `.sum()`). Da `.sum(d => Math.sqrt(d.value ||
0))` bereits VOR dem Packen die sqrt-Transformation anwendet, ergibt sich
Fläche ∝ sqrt(roher `umfang_lfm`-Wert) - exakt dieselbe Kompressionsformel
wie bei der Treemap (dort ebenfalls über `.sum(sqrt)` vor einer
flächen-linearen Layout-Funktion). Keine "doppelte" Kompression oder
Verzerrung durch die Kombination der beiden Schritte, wie im Auftrag
befürchtet - live gemessen (Kategorie "Verwaltung", 62 Bestände, echte
Daten): größter Kreis "Aktenbestand" (18,3 lfm) Radius 78,58px, kleinste
Kreise (0,1 lfm, mehrere gleich große) Radius 21,36px - Radius-Verhältnis
3,68:1, **Flächenverhältnis 13,53:1**. Das entspricht nahezu exakt (auf
zwei Nachkommastellen) dem in der Treemap-Etappe für dieselbe
sqrt-Transformation ermittelten Zielverhältnis von ca. 13,5:1 - bestätigt,
dass die Kombination aus sqrt-Vorverarbeitung und d3.pack()s linearer
Flächenzuordnung konsistent mit der bereits etablierten Kompressionsstärke
ist, keine zusätzliche Verzerrung einführt.

**Circle Packing - Mindestradius, bewusst ANDERS gelöst als bei Treemap/
Sunburst (Begründung, nicht nur Umsetzung).** Treemap/Sunburst korrigieren
NACH dem Layout (Positionen/Größen der bereits vom Algorithmus berechneten
Knoten nachträglich anpassen), weil ihre jeweilige Geometrie (1D-Höhen-
Intervall bzw. 1D-Winkel-Intervall) das ohne Kollisionsrisiko erlaubt. Bei
echten 2D-Kreisen ist eine NACHTRÄGLICHE Vergrößerung riskant: zwei bereits
dicht an dicht gepackte Kreise, von denen einer nachträglich vergrößert
wird, können sich dadurch neu überlappen - das wäre dieselbe Klasse von
Fehler wie die ursprüngliche Treemap-Regression, nur in 2D. Stattdessen
nutzt `packeMitMindestradius()` `d3.pack()`s eigenen `radius()`-Accessor:
erst normal packen (liefert die natürlichen Radien), dann - falls nötig -
ein ZWEITES Mal packen, diesmal mit einer Radius-Funktion, die die zu
kleinen Radien auf den Mindestwert anhebt (`Math.max(d.r, mindestRadius)`).
Der PackungsALGORITHMUS selbst (nicht eine nachträgliche Korrektur)
garantiert für JEDE ihm übergebene Radius-Menge eine überlappungsfreie
Anordnung - das eliminiert das 2D-Kollisionsrisiko strukturell, statt es
nachträglich zu prüfen. Machbarkeits-Check vorab (Gesamtfläche bei
durchgängigem Mindestradius vs. 60% der Canvas-Fläche als konservative
Packungsdichte-Schätzung) verhindert, dass der zweite Packungsdurchlauf bei
rechnerisch unmöglichen Fällen unkontrolliert über den Canvas-Rand
hinauswächst.

Beide Fälle live verifiziert, inkl. PAARWEISER Überlappungsprüfung (nicht
nur Stichprobe) über alle Kreise: bei "Vermögen und Finanzen" (142
Bestände) auf einem verkleinerten 300×250px-Canvas fielen 129 von 142
Kreisen unter den 12px-Mindestradius - Gesamtfläche bei durchgängigem
Mindestradius (129 × π×12² ≈ 58.360px²) übersteigt die konservativ
geschätzte verfügbare Fläche (300×250×0,6 = 45.000px²) - korrekt NICHT
korrigiert, kleinster Kreis blieb bei 4,58px, 0 Überlappungen (reine
Natural-Packung, die per Definition nie überlappt). Bei "Bevölkerung und
Bevölkerungsgruppen" (29 Bestände) auf 230×200px: 18 von 29 Kreisen
korrekt auf exakt 12px angehoben, 0 verbleibend darunter, 0 Überlappungen
AUCH nach dem zweiten Packungsdurchlauf - bestätigt, dass die erneute
Packung mit geflossenen Radien tatsächlich überlappungsfrei bleibt, wie
von `d3.pack()`s Garantie erwartet.

**Fokus-Indikator:** Icicle bewusst OHNE eigenen Indikator gelassen
(rechteckige Segmente, Standard-Fokusrahmen entspricht der sichtbaren
Form, wie bei der Treemap - vom Auftrag explizit als "unproblematisch"
eingestuft, nicht eigenständig neu bewertet). Circle Packing bekam
denselben Fix wie Sunburst (`outline: none` nur für die betroffene Klasse,
JS-gesteuerter Ersatz-Indikator über `focus`/`blur` mit `.highlight`-
Namespace, `randStilFuerKreis()` als Gegenstück zu Sunbursts
`randStilFuerSegment()`) - strukturell identischer Code, nur für Kreise
statt Bögen, wie vom Auftrag verlangt ("denselben ... Ansatz aus dem
Sunburst-Fix verwenden"). Live verifiziert: `outlineStyle` nach Fokus
`"none"`, eigener Indikator (`#e07820`, 3px) erscheint/verschwindet
korrekt bei focus/blur.

**Regressionstest (frischer Server/Tab, echte Daten, 1000×900):** Treemap
(Kategorie-Zoom, Kachel-Klick öffnet Sidebar mit korrektem Titel, erneuter
Klick schließt sie, Fokus landet korrekt auf `.treemap-svg-bereich`) und
Sunburst (Zoom in Kategorie, Bestand-Klick öffnet Sidebar, Zentrum-Klick
schließt sie und stellt alle 12 Kategorie-Segmente wieder her) erneut
stichprobenartig gegengeprüft, da beide dieselben, jetzt von VIER Modulen
gemeinsam genutzten Dateien (`kategorieFarben.js`, `sidebar.js`,
`bestandsHierarchie.js`) importieren - unverändert funktionsfähig, keine
Regression durch die neuen Icicle-/Circle-Packing-Importe. Icicle: 12
Kategorie-Segmente in der Übersicht (korrekte Farben, sqrt-Breiten inkl. 6
am 24px-Boden), Zoom in "Verwaltung" (Breadcrumb "← Verwaltung", 62
Bestand-Segmente, exakt 968px Gesamtbreite, 0 Überlappungen), Breadcrumb-
Rücksprung (12 Kategorien wiederhergestellt), Sidebar-Toggle inkl.
Fokus-Rückgabe, Unsicherheiten-Toggle über `resize()` (Navigation bleibt
erhalten), `resize()`/`destroy()`. Circle Packing: 12 Kategorie-Kreise
(korrekte Farben, Zurück-Button korrekt versteckt), Zoom in "Verwaltung"
(Flächenverhältnis-Verifikation s. o.), Zurück-Button-Rücksprung,
Sidebar-Toggle inkl. Fokus-Rückgabe, Fokus-Indikator, Mindestradius-
Korrektur (beide Fälle, s. o.), `resize()`/`destroy()`. Keine
Konsolenfehler auf jeder getesteten Seite/Aktion.

---

## 2026-09-05 (6) – Sunburst: Fokusrahmen-Fix + gemeinsame Sidebar-Architektur

**Betrifft:** `js/viz/sunburst.js`, `js/viz/treemap.js` (nur Extraktion),
`js/utils/sidebar.js` (neu). Kurzfassung in `CHANGELOG.md`, hier die
Herleitung inkl. eines beim Umsetzen entdeckten Event-Handler-Konflikts
und einer strukturellen Notwendigkeit.

**Punkt A - Root-Cause, per Spezifikation begründet statt nur per
Bildschirmfoto vermutet.** Versuch, den Fokusrahmen per echtem
Mausklick (wie im Bug-Report beschrieben) über das `computer`-Werkzeug
zu reproduzieren, scheiterte an der Umgebung (`Browser pane is not
displayed` - kein Screenshot/Klick mit Bildschirmkoordinaten möglich in
dieser Sitzung). Stattdessen den Root Cause auf CSS-Spezifikationsebene
hergeleitet, was VOLLSTÄNDIGE Gewissheit statt einer Bildschirm-
Beobachtung liefert: `base.css` enthält bereits `[tabindex]:focus-visible
{ outline: 3px solid var(--accent); outline-offset: 2px; }` - diese Regel
trifft automatisch auf JEDES Element mit `tabindex`-Attribut zu, also auch
auf `.sunburst-segment` (bekommt `tabindex="0"` beim `.join('g')` in
`zeichneSunburst()`). CSS `outline` ist laut Spezifikation (CSS Basic User
Interface Module) IMMER ein Rechteck entlang der Border-Box des Elements -
unabhängig vom Inhalt (Bild, Pfad, beliebige Form). Ein `<path>`, dessen
sichtbare Form eine gekrümmte Kreisscheibe ist, hat trotzdem eine
rechteckige (achsenparallele) Bounding-Box als Border-Box - der Rahmen
kann der Bogenform also durch keine Kombination von Fokus-Pseudoklasse
oder Browser-Heuristik jemals folgen. Das ist eine spezifikationsseitige
Garantie, keine implementierungsspezifische Vermutung - deshalb hier mit
voller Sicherheit bestätigt, obwohl der exakte Bildschirm-Nachweis per
echtem Mausklick in dieser Umgebung nicht möglich war. Bei `treemap.js`s
rechteckigen Kacheln (`<rect>`) sind Border-Box und sichtbare Form
identisch - daher fällt es dort nicht auf, exakt wie im Auftrag vermutet.

Ergänzender Hinweis zur Testmethodik: `getComputedStyle` nach einem
PROGRAMMATISCHEN `.focus()`-Aufruf liefert nicht immer dieselbe
`:focus-visible`-Übereinstimmung wie ein echter, vertrauenswürdiger
(`isTrusted`) Tastatur- oder Mausfokus - in ersten Tests zeigte
`outlineStyle` deshalb fälschlich "none" schon VOR jeder Korrektur. Nach
der Korrektur wurde stattdessen direkt geprüft, dass die eigene
`outline:none`-Regel (die unabhängig von `:focus`-vs-`:focus-visible`-
Nuancen für BEIDE Pseudoklassen gilt) den nativen Rahmen zuverlässig
unterdrückt, und dass der JS-gesteuerte Ersatz-Indikator bei einem
`focus`-Event (nicht `:focus-visible`-abhängig, da per JS-Listener
implementiert) zuverlässig erscheint/verschwindet - das ist unabhängig
von der `isTrusted`-Nuance korrekt testbar und wurde entsprechend
verifiziert.

**Punkt A - Umsetzung.** `outline: none` für `.sunburst-segment`/
`.sunburst-zentrum` in `fuegeStyleEin()` (neu in `sunburst.js`, vorher gab
es dort noch keinen injizierten `<style>`-Tag). Ersatz-Indikator PER JS
(nicht per CSS `:focus-visible`-Regel) - derselbe Grund wie bei treemap.js'
Kategorie-Gruppen-Hervorhebung bereits nachgewiesen (ein per `.attr()`
gesetztes SVG-Präsentationsattribut hat in dieser Laufzeitumgebung Vorrang
vor einer reinen CSS-Regel für dieselbe Eigenschaft) - der Event+`.attr()`-
Ansatz ist deshalb die bewährte, nicht nur vermutete Lösung.
`randStilFuerSegment()` kapselt den "Ruhezustand" (Auswahl > unsicher >
neutral, inkl. "ohne Kategorie"-Strichelung) an EINER Stelle, wiederverwendet
beim initialen Zeichnen UND beim Zurücksetzen nach `blur` - vermeidet, dass
beide Stellen bei einer künftigen Änderung auseinanderlaufen. Das Zentrum
bekam denselben Fix (dessen Kreis-Bounding-Box ist zwar weniger auffällig
fehlplatziert als bei den Bogen-Segmenten, aber ohne Ersatz wäre die
pauschale `outline:none`-Regel für `.sunburst-zentrum` ein WCAG-Verstoß
gewesen - beim Implementieren bemerkt und mitbehoben, nicht nachträglich).

**Bei der Umsetzung entdeckter Event-Handler-Konflikt (nicht Teil der
ursprünglichen Planung):** `wireTooltip()` registrierte bisher
`.on('mouseenter focus', ...)` und `.on('mouseleave blur', ...)` OHNE
Namespace. D3 erlaubt pro Selektion und Event-TYP nur EINEN Handler ohne
Namespace - ein zweiter `.on('focus', ...)`-Aufruf (für die neue
Fokus-Hervorhebung) hätte den von `wireTooltip()` bereits gesetzten
`focus`-Handler schlicht ÜBERSCHRIEBEN (oder umgekehrt, je nach
Aufrufreihenfolge) - der Tooltip wäre beim Fokussieren nicht mehr
erschienen, oder die Hervorhebung nicht mehr gegriffen, je nachdem welche
Funktion zuletzt gebunden wurde. Vor dem ersten Test bereits beim
Schreiben des Codes bemerkt (Kenntnis von D3s `.on()`-Verhalten), durch
Namespacing behoben: `wireTooltip()` nutzt jetzt
`.on('mouseenter.tooltip focus.tooltip', ...)`, die neue
`wireFokusHighlight()` nutzt `.on('focus.highlight', ...)` - beide
Handler bleiben unabhängig registriert und feuern beide, unabhängig von
der Aufrufreihenfolge. Per Test verifiziert: Tooltip erscheint weiterhin
bei Hover/Fokus, UND die Fokus-Hervorhebung greift unabhängig davon.

**Strukturelle Notwendigkeit, beim Umsetzen entdeckt (nicht Teil der
ursprünglichen Planung):** `sunburst.js` zeichnete bisher direkt in
`container` (die geteilte `.viz-inhalt`) und leerte diesen bei jedem
Redraw komplett (`container.innerHTML = ''`, siehe vorherige Etappe).
Sobald die Sidebar als Geschwisterelement in DEMSELBEN `container` hängt,
hätte JEDER Redraw (Zoom, Zentrum-Klick, Resize, Unsicherheiten-Toggle)
die Sidebar mitgelöscht. Beim Schreiben von `render()` bemerkt, bevor es
zu einem sichtbaren Fehler kam - behoben durch denselben Strukturkniff wie
`treemap.js`: ein eigener `.sunburst-svg-bereich`-Unter-Container
(`tabindex="-1"`, dient zugleich als Fokus-Fallback-Ziel), der jetzt allein
geleert/neu gezeichnet wird; `container` selbst wird nur einmal in
`render()` geleert und trägt seitdem SVG-Bereich UND Sidebar als
Geschwister. Erforderte eine zusätzliche CSS-Regel
(`.sunburst-svg-bereich { height: 100%; }`), da ein Block-Kind ohne
eigene Höhenregel die Höhe seines Elternteils nicht automatisch ausfüllt
(dieselbe Erkenntnis wie in der Vollbild-Etappe) - die Sidebar selbst
(`position: fixed`) nimmt am normalen Fluss nicht teil und beeinflusst
diese Höhenmessung nicht.

**Punkt B - Sidebar-Extraktion, Vergleich vor/nach (wie bei der
Farblogik-Auslagerung explizit verlangt).** `js/utils/sidebar.js` neu
angelegt mit `STANDARD_SIDEBAR_FELDER` (identisch zur bisherigen
`SIDEBAR_FELDER`-Liste in `treemap.js`, nur umbenannt und exportiert),
`baueSidebarGeruest()`, `baueSidebarInhalt()`, `oeffneSidebar()`,
`schliesseSidebar()`, `fuegeSidebarStyleEin()`. Bewusste
Architekturentscheidung (Schritt 2, Generalisierung): `sidebar.js`
kennt WEDER die Farbskala noch die aufrufende Modul-Instanz - `oeffneSidebar()`
nimmt eine fertige `{kategorieName, kategorieFarbe, felder}`-Konfiguration
entgegen, die der AUFRUFER (treemap.js/sunburst.js) aus seiner eigenen
`instanz.kategorieFarbSkala` berechnet. `passendeTextfarbe` wird direkt aus
`kategorieFarben.js` importiert (kein weiterer Konfigurationsparameter
nötig, da das eine stabile, bereits geteilte Funktion ist - nur die
tatsächlich MODULABHÄNGIGEN Werte werden als Parameter durchgereicht).
Der Schließen-Button wird von `baueSidebarGeruest()` NICHT selbst
verdrahtet (gibt `schliessenBtn` im Rückgabewert zurück) - der Grund:
der passende Fokus-Fallback (`instanz.svgBereich`) steht zum Zeitpunkt des
Sidebar-Aufbaus noch nicht fest (die Modul-Instanz wird erst NACH
`baueSidebarGeruest()` in `render()` erzeugt) - das Verdrahten bleibt
deshalb beim jeweiligen Aufrufer, der zum Klick-Zeitpunkt lazy auf seine
eigene, dann bereits existierende `instanz` zugreift (derselbe
Closure-Mechanismus wie in der ursprünglichen treemap.js-Fassung).

CSS-Klassen umbenannt (`treemap-sidebar*` → `bestand-sidebar*`) - per
`grep -r "treemap-sidebar" css/` vorab geprüft: kein anderes CSS-File
referenzierte die alten Namen (das gesamte Sidebar-Styling lebte
ausschließlich in `treemap.js`s injiziertem `<style>`), die Umbenennung war
also gefahrlos möglich.

Vergleich vor/nach, konkret getestet (nicht nur angenommen): Treemap-Zoom
in eine Kategorie, Klick auf eine Kachel öffnet Sidebar mit Titel
"Pfundbücher Stein", Badges `["Stadt und Raum", "Grund und Boden"]` -
identisch zur vorherigen Fassung. Erneuter Klick auf dieselbe (live
abgefragte, nicht die durch den Redraw bereits ersetzte) Kachel schließt
die Sidebar UND setzt den Fokus korrekt auf `.treemap-svg-bereich`
(`fokusAufSvgBereich: true`, `fokusAufBody: false`) - der in der
vorletzten Etappe behobene Verwaisungs-Bug bleibt bestätigt behoben.
Kategorie-Hover-Hervorhebung (`stroke-width` 2.5→4.5→2.5), Zurück-Button
(12 Kategorie-Gruppen wiederhergestellt, Titel leer, Sidebar geschlossen),
`resize()` (500×500 korrekt übernommen), `destroy()` (Werkzeugleiste
vollständig entfernt) - alle nach der Extraktion unverändert.

**Generalisierung für Icicle/Circle Packing (Schritt 2, vorbereitet, NICHT
umgesetzt - Nicht-Ziel).** Da `sidebar.js` keinerlei Geometrie-Annahme
trifft (nur Container/`record`/Konfiguration), wäre für beide Module KEINE
Änderung an `sidebar.js` selbst nötig. Was JEWEILS modul-eigen ergänzt
werden müsste, wenn dieser Folgeauftrag kommt: (1) ein dünner Wrapper
analog zu `treemap.js`s `oeffneSidebar()`, der aus der jeweiligen
Kategorie eines angeklickten Knotens Name+Farbe über die eigene
`instanz.kategorieFarbSkala` ermittelt und `sidebarModul.oeffneSidebar(...)`
aufruft; (2) ein eigener `svgBereich`-artiger Unter-Container mit
`tabindex="-1"` als Fokus-Fallback, sofern diese Module (wie zuvor
`sunburst.js`) aktuell noch direkt in den geteilten Container zeichnen -
falls sie das bereits nicht tun, entfällt dieser Schritt; (3) Klick-/
Toggle-Verdrahtung auf den jeweiligen Blatt-Elementen, analog zu
`waehleBestandAus()`/`waehleBestand()`. Keine dieser drei Anpassungen
erfordert eine neue Architekturentscheidung - alle folgen demselben, jetzt
zweimal (Treemap, Sunburst) erprobten Muster.

**Punkt C/D - Sunburst-Integration, per Test verifiziert:** Klick auf ein
Bestand-Segment in der Kategorie-Ansicht öffnet die Sidebar mit denselben
Feldern wie die Treemap (Badges `["Verwaltung", "Kommunale Verwaltung"]`,
9 Felder inkl. "Umfang"/"Zitierweise"/"Kurzbeschreibung" als erste drei).
Erneuter Klick auf dasselbe (live abgefragte) Segment schließt die Sidebar,
Fokus landet korrekt auf `.sunburst-svg-bereich` (nicht `<body>`). Klick
auf ein ANDERES Segment bei bereits offener Sidebar aktualisiert Titel/
Inhalt ohne Zwischenschritt (`Aktenbestand` → `Ratsprotokolle im
Justizfach`). Zentrum-Klick (zurück zur Übersicht) schließt die Sidebar
automatisch mit. Unsicherheiten-Toggle über `resize()` lässt sowohl die
Navigationsposition (62 Bestand-Segmente der Kategorie "Verwaltung" bleiben
sichtbar) ALS AUCH den offenen Sidebar-Zustand (Titel unverändert)
bestehen - eine zusätzliche, über den ursprünglichen `app.js`-Fix
hinausgehende Bestätigung, dass `resize()` wirklich nur die Optionen
aktualisiert, ohne jeglichen anderen Zustand zu berühren.

**Verifikation (frischer Server/Tab wegen des bekannten Modul-Caching-
Verhaltens dieser Sitzung, echte Daten, 1000×900):** Alle oben genannten
Punkte per Test bestätigt, zusätzlich: Mindestwinkel-Korrektur (Kategorie
"Verwaltung", 62 Segmente, weiterhin exakt 360,00° Gesamtwinkel, 0
Überlappungen) und "ohne Kategorie"-Darstellung (Farbe `#8a8a8a`,
Punktmuster) unverändert funktionsfähig nach dem umfangreichen Umbau der
Zeichenschleife. Sunburst `resize()`/`destroy()` sowie Treemap
`resize()`/`destroy()` beide geprüft. Keine Konsolenfehler auf jeder
getesteten Seite/Aktion.

---

## 2026-09-05 (5) – Bestandsverzeichnis-Sunburst: Interaktivität, Farben, Skalierung

**Betrifft:** `js/viz/sunburst.js` (komplette Überarbeitung),
`js/utils/kategorieFarben.js` (neu), `js/viz/treemap.js` (Import statt
lokaler Farblogik). Kurzfassung in `CHANGELOG.md`, hier die vollständige
Herleitung inkl. zweier während der Umsetzung entdeckter Zusatzbefunde.

**Root-Cause-Analyse (Schritt 1 des Auftrags: erst klären, dann patchen).**
`sunburst.js` vor der Überarbeitung gelesen: `farbeFuerKategorie()` griff auf
`CAT_COLORS` aus `js/config/constants.js` zu - dessen Dateikopf sagt
wörtlich, es sei ein "Platzhalter" für `urkunden.csv`s "kategorien"-Spalte,
mit `default: '#888888'` als einzigem Eintrag. Jede `bkk_kategorie` fiel
also zwangsläufig auf Grau zurück. Kein Label-Zeichencode vorhanden (kein
Äquivalent zu `treemap.js`s `platziereAutoFitText()`). Kein `click`-Handler,
kein Navigationszustand in `instanz` (nur `{container, hierarchieDaten,
options}`) - rein statisch gerendert, nur Hover-Tooltip. `wurzel.descendants()
.filter(d => d.depth > 0)` zeichnete alle drei Tiefen (Kategorie/
Unterkategorie/Bestand) der vollen 4-Ebenen-Hierarchie aus
`bestandsHierarchie.js` - erklärt die 3 Ringe im gemeldeten Screenshot.

**Zusatzfund 1, vor Umsetzung mit dem Auftraggeber abgestimmt:** Die
Farb-/Kontrastlogik der Treemap (`baueKategorieFarbSkala`,
`garantiereKontrast`, `farbeFuerUnterkategorie`, `passendeTextfarbe`,
`wcagKontrast`, `OHNE_KATEGORIE_FARBE`) existierte nur als NICHT
exportierte, lokale Funktionen in `treemap.js` - es gab keine
importierbare, gemeinsame Datei dafür, obwohl der Auftrag explizit "bitte
diese Funktion direkt importieren/aufrufen statt die Farbwerte zu
duplizieren" verlangte. Per Rückfrage bestätigt: Auslagerung nach
`js/utils/kategorieFarben.js`, `treemap.js` auf den Import umgestellt. Das
Nicht-Ziel "keine Änderungen an der Treemap" schützt laut Auftraggeber vor
inhaltlichen Verhaltensänderungen, nicht vor einer reinen, verhaltensneutralen
Verschiebung geteilter Logik - ausdrücklich mit Verweis auf das bereits
etablierte Vorgehen bei `bestandsHierarchie.js` bestätigt. NACH der
Umstellung explizit verifiziert (nicht nur angenommen): alle 12 tatsächlich
im gerenderten DOM vorkommenden Kategorie-Randfarben unverändert (`#9451d6`,
`#952395`, `#952323` usw., identisch zu vor der Auslagerung), WCAG-Kontrast
für jede davon per `mod.wcagKontrast()` aus dem neuen Modul frisch berechnet
- schlechtester Wert 4,76:1, weiterhin über der 4,5:1-Anforderung.

**Zusatzfund 2, während des Testens entdeckt (nicht Teil der ursprünglichen
Root-Cause-Analyse):** Beim ersten Test der Kategorie-Ansicht zeigten ALLE
142 Bestände einer Kategorie ("Vermögen und Finanzen") exakt denselben
Winkel (360°/142 = 2,535° je Segment, exakt reproduzierbar) - kein
proportionaler, sqrt-skalierter Unterschied trotz stark unterschiedlicher
`umfang_lfm`-Werte. Direkt am DOM nachgesehen: `d.value` (nach `.sum(sqrt)`)
war für JEDES Blatt identisch `3.1622776601683795` (= √10), UND `d.data.value`
war für jedes Blatt exakt `10`. Root Cause: `render()` rief
`baueBestandsHierarchie(data)` OHNE den seit der Treemap-Etappe existierenden
zweiten Parameter (`mindestgroesse`) auf - fiel dadurch auf den gemeinsamen
Default `MINDESTGROESSE = 10` zurück, der (wie im ursprünglichen
Treemap-Auftrag bereits nachgewiesen) bei einem `umfang_lfm`-Median von 0,2
praktisch alle Bestände auf denselben Wert floort. Das ist exakt der Fehler,
den das Treemap-CHANGELOG bereits als wahrscheinlichen Folgefehler für
`sunburst.js`/`icicle.js`/`circlePacking.js`/`ganttDiagramm.js` angekündigt
hatte - hier für `sunburst.js` konkret angetroffen und behoben, indem
`render()` denselben `MINDESTGROESSE_ROH`-Wert (0,05) wie `treemap.js`
übergibt. `bestandsHierarchie.js` selbst wurde NICHT verändert (Nicht-Ziel
eingehalten) - der Parameter existierte dort bereits seit der Treemap-Etappe,
er wurde in `sunburst.js` nur nicht genutzt.

**Architekturentscheidung: zwei Ansichten, je nur EINE gezeichnete Tiefe.**
Ursprünglich erwogen: die volle 4-Ebenen-Hierarchie beibehalten und die
Unterkategorie-Ebene per manueller Radius-Neuzuordnung (y0/y1 nach
`d3.partition()` überschreiben) unsichtbar machen, mit kaskadierender
Neuskalierung der Nachkommen bei einer nötigen Mindestwinkel-Korrektur der
Kategorie-Ebene selbst - deutlich komplexer, mit realem Fehlerrisiko
(genau die Art kaskadierender Korrektur, die in der Treemap-Etappe zu der
"Vermögen und Finanzen"/"Verwaltung"-Regression geführt hatte). Beim
genauen Lesen von Schritt 2 des Auftrags ("Ebene 1: eine Kachel/ein
Ringsegment PRO KATEGORIE" - nicht "ein Ring aus Kategorien UND ein
zweiter Ring aus Beständen gleichzeitig") wurde klar: In der Übersicht wird
NUR ein Ring aus Kategorie-Segmenten gezeigt, in der Kategorie-Ansicht NUR
ein Ring aus deren Beständen - nie beide gleichzeitig. Das macht die
Radius-Zuweisung trivial (der gezeichneten Ebene wird direkt
`[INNERER_RADIUS, aussenRadius]` zugewiesen, unabhängig davon, was
`d3.partition()`s Standard-Tiefenaufteilung dafür vorgesehen hätte) und
macht jede kaskadierende Neuskalierung überflüssig: `d3.sum()`/
`d3.partition()` berechnen Werte/Winkel für die gezeichneten Blätter
korrekt durch die dazwischenliegende (nicht gezeichnete)
Unterkategorie-Ebene hindurch, ohne dass deren eigene Geometrie jemals
gebraucht oder korrigiert werden muss.

**Mindestwinkel-Korrektur: Design bewusst analog, aber EINFACHER als die
Treemap-Lösung.** Die Treemap brauchte mehrere Anläufe (Duplikat-Positionen
→ unbegrenzter Stapel-Cursor → finale Lösung: keine Verschiebung bei
mehreren betroffenen Geschwistern), weil `d3.treemap()`s 2D-Squarified-Layout
komplexe, teils willkürliche Sub-Strukturen erzeugt, in denen ein
gemeinsamer, positions-unabhängiger Korrektur-Cursor zwangsläufig mit
anderen Geschwistern kollidieren kann. `d3.partition()` ist dagegen eine
REINE 1D-Intervall-Aufteilung - garantiert von Haus aus überlappungsfrei für
ALLE Geschwister, unabhängig von der Korrektur. Das erlaubt einen strengeren,
aber immer noch sicheren Ansatz: ein iteratives Wasserfüllungsverfahren
(`korrigiereWinkelFuerGeschwister()`) - zu kleine Segmente werden zuerst auf
den Mindestwinkel fixiert, das Defizit wird anteilig von den verbleibenden
(noch nicht fixierten) Geschwistern abgezogen, in Runden bis stabil (jede
Runde fixiert mindestens ein weiteres Element oder die Schleife endet -
Terminierung nach spätestens N Runden garantiert). Ist der GESAMTE benötigte
Mindestplatz für alle initial zu kleinen Segmente von vornherein größer als
der verfügbare Gesamtwinkel, wird NICHTS korrigiert (dieselbe, bereits in
der Treemap etablierte "kein Korrektur-Versuch bei rechnerisch
unmöglichen Fällen"-Regel) - Segmente bleiben an ihrer regulären,
wertproportionalen, von `d3.partition()` bereits garantiert
überlappungsfreien Position.

**Mindestwinkel-Wert, empirisch hergeleitet:** Ziel-Bogenlänge 24px
(dieselbe Fitts'sches-Gesetz-Konstante wie `treemap.js`s
`MINDESTHOEHE_ZELLE`), responsiv in einen Winkel umgerechnet
(`24 / aussenRadius` im Bogenmaß) - bewusst NICHT als fixer Grad-Wert
gewählt, da ein fixer Winkel bei unterschiedlichen Containergrößen ganz
unterschiedliche tatsächliche Pixelgrößen ergäbe (bei einem sehr großen
Radius wäre ein fixer 3°-Winkel bereits deutlich mehr als 24px Bogenlänge -
unnötig konservativ; bei einem kleinen Radius entsprechend zu wenig).
Empirische Prüfung an den ECHTEN, aktuellen Daten (nicht geraten): direkt im
Browser über die bereits gerenderten Kacheln der Treemap die Records
zurückgewonnen, nach Kategorie gruppiert, sqrt-transformierte Werte
berechnet, Winkelanteile bei typischen Radien (338,5px und 442px, aus real
gemessenen Containergrößen) simuliert. Ergebnis: In der dichtesten Kategorie
("Vermögen und Finanzen", 142 Bestände) fallen 32-109 von 142 Segmenten
unter den Mindestwinkel, je nach Containergröße - bei 338,5px Radius wird
der GESAMTE Mindestplatzbedarf (109 × Mindestwinkel) knapp über 360°
gerechnet (unmöglich, keine Korrektur), bei größeren Radien knapp darunter
(möglich, Korrektur greift). Live am tatsächlich gerenderten DOM bestätigt
(nicht nur simuliert): bei Radius 338,5px blieben nach dem Zoom in "Vermögen
und Finanzen" tatsächlich Segmente bei nur 0,9° (unkorrigiert, wie erwartet
bei "rechnerisch unmöglich"), Gesamtwinkel weiterhin exakt 360,00°, 0
Überlappungen. Bei "Verwaltung" (62 Bestände, deutlich weniger dicht):
38 von 62 Segmenten exakt auf den Mindestwinkel (4,062°) fixiert, 0
verbleibend darunter - die Korrektur griff hier korrekt.

**sqrt-Winkeltransformation, explizit gegengeprüft statt angenommen (wie im
Auftrag verlangt).** Reasoning: `d3.partition()` vergibt Winkel LINEAR
proportional zum `.value` jedes Knotens (`x1 - x0 ∝ value`), im Unterschied
zu einer Fläche, die von ZWEI Dimensionen abhängt. Da `.sum()` bereits VOR
`d3.partition()` mit `(d) => Math.sqrt(d.value || 0)` aufgerufen wird, ist
der resultierende `.value` jedes Knotens bereits die sqrt-transformierte
Summe - die anschließende lineare Winkelvergabe durch `d3.partition()`
überträgt diese Transformation folglich direkt und unverfälscht auf den
WINKEL, nicht auf eine Pixelfläche (die bei einer Ringstruktur ohnehin
zusätzlich vom Radius abhinge, hier aber irrelevant ist, da nur EIN
Radius-Band pro Ansicht gezeichnet wird). Nicht nur theoretisch hergeleitet,
sondern am DOM verifiziert: größtes/kleinstes Segment-Winkelverhältnis in
"Vermögen und Finanzen" (142 Bestände) gemessen mit 12,73:1 - nahe am aus
der Treemap-Etappe bekannten Zielverhältnis von ca. 13,5:1 (kleine Abweichung
durch die zusätzliche Mindestwinkel-Fixierung einiger Segmente auf dieselbe
Untergrenze, die die Extremwerte leicht zusammenzieht - erwartet, keine
Abweichung in der Transformationslogik selbst).

**Beschriftung:** Radiale Textausrichtung (vom inneren zum äußeren
Segmentrand), in der unteren Kreishälfte um 180° gespiegelt (Standardmuster
für Sunburst-Diagramme, verhindert auf dem Kopf stehenden Text) - Auto-Fit
mit derselben heuristischen Zeichenbreite (0,57 × Schriftgröße) wie
`treemap.js`s `platziereAutoFitText()`, Mindestschriftgröße 11px, keine
Abschneidung. Live geprüft: bei einem typischen Radius zeigten größere
Segmente (Vermögen und Finanzen 160°, Verwaltung 70° usw.) Labels, kleinere
(Rechtswesen/Stadt und Raum bei je 14,6°) korrekt keines - die verfügbare
Bogenlänge am Textstart reichte dort rechnerisch nicht für eine volle
11px-Zeilenhöhe.

**Zentrum:** In der Übersicht reiner Informationstext (Gesamtzahl der
Bestände) ohne `cursor:pointer`, ohne Klick-Handler, ohne `tabindex` -
bewusst NICHT wie klickbar gestaltet, da es in diesem Zustand nichts gibt,
wohin man von der Übersicht aus "zurück" navigieren könnte (vermeidet die
spiegelverkehrte Variante der in der Treemap behobenen
Klickbarkeits-Verwechslung). In der Kategorie-Ansicht: Kategoriename +
"← zurück", `cursor:pointer`, Hover-Hervorhebung (Hintergrundfarbwechsel),
`tabindex=0`/`role="button"`/Tastaturzugriff (Enter/Leertaste) - alles per
Test verifiziert, inklusive des Rückwegs zur Übersicht per simuliertem
`keydown`.

**Bewusst nicht umgesetzt, nach Rückfrage:** Kein Sidebar-Klick auf
einzelne Bestand-Segmente in der Kategorie-Ansicht (der Auftrag spezifiziert
nur Kategorie-Zoom und Zentrum-Klick als Soll-Zustand). Eine Sidebar-Parität
mit der Treemap hätte eine weitere, deutlich größere Auslagerung aus
`treemap.js` erfordert (Sidebar-Gerüst, -Inhalt, Fokus-Handling, aktuell
komplett undurchlässig in `treemap.js`) - laut Auftraggeber ein separater,
eigener Auftrag mit eigener Architekturentscheidung (u. a. ob eine solche
Auslagerung gleich für Icicle/Circle Packing mitvorbereitet werden soll).
Stattdessen: Hover-Tooltip auf Bestand-Segmenten über die bereits
bestehende `baueTooltipText()` (liefert Name, Kategorie, Unterkategorie,
Umfang, Unsicherheits-Hinweis - deckt die vom Auftraggeber gewünschten
Kerninformationen "Name, umfang_lfm" bereits ab, ohne die geteilte Funktion
zu verändern).

**Nebenbefund, beim Herleiten des Mindestwinkel-Werts entdeckt:** Ein erster
Testlauf auf dem bis dahin in dieser Sitzung mehrfach wiederverwendeten
Server-Port zeigte 329 Datensätze/13 Kategorien (inkl. "Bildung und
Erziehung") - identisch zu den in der Treemap-Etappe dokumentierten Zahlen.
Nach dem Wechsel auf einen fabrikneuen Port (derselbe, bereits mehrfach in
dieser Sitzung nötige Cache-Umgehungs-Workaround) zeigten sich stattdessen
315 Datensätze/12 Kategorien - "Bildung und Erziehung" nicht mehr vorhanden.
Per `Import-Csv` DIREKT gegen die Datei auf der Festplatte verifiziert
(unabhängig von jedem Server/Browser-Caching): 315 Datenzeilen, 12
eindeutige `bkk_kategorie`-Werte plus leere Werte - die aktuelle Datei hat
sich also zwischen der Treemap-Etappe und dieser Sitzung serverseitig/durch
den Auftraggeber geändert, kein Cache-Artefakt und keine Fehlfunktion eines
meiner Skripte. Alle in diesem Eintrag berichteten konkreten Zahlen (142,
62, 109, 28, 12,73:1 usw.) beziehen sich auf den JETZT aktuellen Datenstand;
frühere, im Treemap-CHANGELOG dokumentierte Zahlen (153, 109 in
"Öffentliches Vermögen" usw.) waren zum damaligen Zeitpunkt korrekt, spiegeln
aber nicht mehr den aktuellen Datensatz wider - keine rückwirkende
Korrektur der alten Einträge vorgenommen, da sie als Zeitpunkt-Protokoll
weiterhin akkurat sind.

**Verifikation (drei Viewport-Größen, frische Server/Tabs wegen des
bekannten Modul-Caching-Verhaltens dieser Sitzung, echte Daten):**
1000×900 (Übersicht: 12 Segmente korrekt gefärbt/beschriftet; Zoom in
"Vermögen und Finanzen": 142 Segmente, 0,9°-360°-Verteilung, 0
Überlappungen, Gesamtwinkel exakt 360,00°; Zoom in "Verwaltung": Korrektur
korrekt gegriffen, 38/62 exakt am Mindestwinkel). 380×700 (schmales
Fenster): 12 Segmente, 0 Überlappungen, weniger Labels (3 statt mehr, wie
erwartet bei weniger Radius). Tastaturzugriff (Kategorie-Zoom UND
Zentrum-Rückweg per `Enter`) verifiziert. Unsicherheits-Kennzeichnung
(gestrichelter roter Rand `#c0392b`, Schraffur-Overlay, Warnsymbol) an
einem konkreten, tatsächlich `daten_unsicher: true` tragenden Bestand
("Einzelne Rechnungsbücher" in "Vermögen und Finanzen") verifiziert -
initial fälschlich als Fehler eingestuft, weil `unsicherheitModusAktiv` in
`state.js` standardmäßig `false` ist (dieselbe Voreinstellung wie bei der
Treemap) und der Button in diesem Testlauf zunächst nicht angeklickt worden
war - nach Korrektur des Testablaufs (Button zuerst aktivieren) alle drei
Kennzeichnungs-Kanäle korrekt bestätigt. `resize()` (500×500, Navigation
bleibt erhalten) und `destroy()` (Container vollständig geleert) geprüft.
Unsicherheiten-Toggle über `resize()` (nicht `render()`, siehe die
vorherige `app.js`-Korrektur) verifiziert: Navigationsposition bleibt beim
Umschalten erhalten. `treemap.js` auf demselben Server/Datensatz erneut
gegengeprüft (12 Kategorie-Gruppen, 315 Kacheln, unverändert funktionsfähig)
- bestätigt, dass die Farblogik-Auslagerung keine Regression verursacht hat.
Keine Konsolenfehler auf jeder getesteten Seite/Größe.

---

## 2026-09-05 (4) – Vollbild-/Viewport-Anpassung aller 31 Visualisierungsmodule

**Betrifft:** `css/layout.css`, `js/viz/treemap.js` (eine Zeile). Kurzfassung
in `CHANGELOG.md`, hier die Herleitung inkl. eines eigenen Fehlversuchs.

**Auftrag verlangte explizit: erst Root-Cause-Analyse zurückmelden, nicht
direkt patchen** (Schritt 1) - entsprechend zuerst nur recherchiert und dem
Auftraggeber vorgelegt, bevor irgendeine Datei geändert wurde.

**Root-Cause-Recherche, Schritt für Schritt:**
1. `index.html`/`css/layout.css` gelesen: `#app-content { max-width:1100px;
   margin:0 auto; padding:var(--space-4); min-height:60vh; }` - eine feste,
   viewport-unabhängige Breitendeckelung. `min-height:60vh` erschien auf den
   ersten Blick wie eine Höhenanpassung, ist aber wirkungslos für Kinder: ein
   `min-height` auf einem Block-Elternteil vererbt sich nicht automatisch an
   Kind-Elemente ohne eigene Höhen-/Flex-Regel - `.viz-inhalt` selbst hatte
   nur `margin-top`, keine Höhenregel.
2. `js/core/app.js` gelesen: `#app-content` (bzw. dessen darin erzeugte
   Unter-Container wie `.viz-inhalt`) ist tatsächlich für alle 31 Module
   gemeinsam (`erzeugeUnterContainer('viz-inhalt')`), bestätigt die
   Vermutung aus dem Auftrag.
3. Per `grep -n "const breite\|const hoehe" js/viz/*.js` über alle 31
   Dateien systematisch nachgesehen, WIE jedes Modul seine Canvas-Größe
   bestimmt (nicht angenommen, sondern nachgesehen) - drei klar
   unterscheidbare Gruppen gefunden:
   - **4 Module lesen `container.clientHeight` bereits dynamisch**
     (treemap, sunburst, icicle, circlePacking) - würden von einem größeren
     Container SOFORT profitieren, ohne jede Code-Änderung.
   - **~12 Module nutzen eine feste Höhe** (`options.height || 600/700/
     800/900`, z. B. karte.js, sankey.js, personennetzwerk.js,
     bipartiteFlowMap.js) - lesen `clientHeight` gar nicht.
   - **~15 Module berechnen die Höhe bewusst aus der Datenmenge**
     (`kategorien.length * ZEILENHOEHE` o. ä., z. B. ganttDiagramm,
     ridgeline, zeitachse, dotPlot, swimlanes, horizonChart, familienbaum,
     korrelationsmatrix, adjazenzmatrix, arcDiagramm, bipartiterGraph,
     kalenderHeatmap) - ihre Höhe SOLL von der Datenmenge abhängen (ein
     Gantt mit 200 Zeilen braucht mehr Platz als ein Viewport hat), nicht
     erzwungen auf Viewport-Höhe gepresst werden.
   - Breite dagegen: ALLE 31 Module lesen bereits `container.clientWidth`
     (per Grep bestätigt) - eine reine Breitenkorrektur am gemeinsamen
     Container wirkt daher sofort auf alle 31, ganz ohne Modul-Änderung.
4. `treemap.js` als Sonderfall identifiziert: rendert NICHT direkt in
   `container`, sondern erzeugt intern zwei eigene Kinder
   (`.treemap-werkzeugleiste`, `.treemap-svg-bereich`) - Letztere misst
   `svgBereich.clientHeight`, nicht `container.clientHeight`. Deren
   bisherige feste `min-height:480px` hätte auch bei einem größeren
   `.viz-inhalt` nicht automatisch mitgewachsen (ein Block-Kind füllt die
   Höhe seines Elternteils nicht automatisch, ohne eigene Flex-/Höhenregel -
   derselbe Mechanismus wie unter Punkt 1). Das ist die einzige Stelle, an
   der eine (rein kosmetische) Modul-Datei-Änderung nötig würde - dem
   Auftraggeber vor Umsetzung vorgelegt und bestätigt bekommen, wie im
   Auftrag verlangt ("falls eine Modul-Anpassung zwingend nötig ist, vorab
   melden").
5. Resize-Infrastruktur (`app.js`, `RESIZE_DEBOUNCE_MS=200`,
   `generation`-Zähler, `window.addEventListener('resize', ...)` →
   `aktuellesVizModul.resize()` ohne Argumente) gelesen: ruft bereits
   generisch `resize()` auf jedem Modul auf, jedes Modul liest seine Maße
   selbst frisch aus dem Container - unverändert weiterverwendbar, keine
   Anpassung nötig (im Auftrag als offene Frage gestellt, hier beantwortet).

Dem Auftraggeber zwei konkrete Entscheidungen zur Bestätigung vorgelegt
(AskUserQuestion, wie bei früheren Design-Entscheidungen dieses Projekts):
(a) `#app-content` komplett breit vs. nur ein Breakout-Trick für den
Viz-Bereich allein - Auftraggeber wählte komplett breit + eigene
`max-width:700px` für Platzhalter-Seiten (robuster, zusätzlich inhaltlich
sinnvoll für Fließtext); (b) die eine `treemap.js`-CSS-Zeile - bestätigt,
da sonst das explizite Akzeptanzkriterium "Treemap füllt sichtbar mehr
Fläche" verfehlt worden wäre.

**Umsetzung:**
- `body`: `display:flex; flex-direction:column; min-height:100vh`. Bewusst
  KEIN `calc(100vh - Xpx)` mit hart codierten Pixel-Werten für Header/Footer-
  Höhe - Header nutzt bereits `flex-wrap` (siehe `.app-header-inner`) und
  wird bei schmalen Fenstern höher (real gemessen: 61px bei ≥700px Breite,
  158px bei 375px Breite, da Logo+Navigation umbrechen) - ein fixer
  Pixel-Abzug wäre dort schlicht falsch gewesen. `.app-header`/`.app-footer`
  bekommen `flex:0 0 auto` (natürliche Höhe, wachsen nicht).
- `#app-content`: `flex:1 1 auto` (füllt die verbleibende Höhe), `max-width`
  entfernt (volle Breite), UMGESTELLT auf `display:grid` statt einer
  einfachen Flex-Spalte - Grund: `.werkzeugleiste-unsicherheit` und
  `.werkzeugleiste-wechseln` sind zwei DOM-GESCHWISTER ohne gemeinsamen
  Wrapper (`app.js` hängt beide direkt an `contentRoot`/`#app-content` an,
  siehe `erzeugeUnterContainer()`) - mit einer Flex-SPALTE auf
  `#app-content` würden beide zu eigenen, vertikal gestapelten Zeilen
  (jeder direkte Flex-Kind-Container wird bei `flex-direction:column`
  unabhängig von seinem eigenen `display`-Wert block-artig gestapelt,
  das bisherige `display:inline-block` auf beiden Elementen hätte keine
  Wirkung mehr) - das hätte die bestehende Nebeneinander-Anordnung der
  Werkzeugleiste sichtbar verändert, ohne dass das explizit beauftragt war.
  CSS Grid mit expliziter Zuordnung (`grid-column`/`grid-row` je Klasse)
  löst das, OHNE einen zusätzlichen Wrapper-Div in `app.js` einzuführen
  (Nicht-Ziel: keine weitere Änderung an `renderBestandTab()`/
  `renderVisualisierungenTab()`) - die Klassennamen sind stabil (aus
  `erzeugeUnterContainer(klasse)`-Aufrufen in `app.js` ausgelesen, alle drei
  möglichen Zustände von `#app-content`s direkten Kindern durchgesehen: (1)
  Viz-Tab - immer exakt `.werkzeugleiste-unsicherheit`,
  `.werkzeugleiste-wechseln`, `.kleiner-bildschirm-hinweis`,
  `.viz-inhalt`, in dieser Reihenfolge; (2) Visualisierungen-Tab ohne
  gewählten Archivalientyp - nur `.kachelauswahl-bereich`; (3)
  Platzhalter-Tabs - nur `.platzhalter-seite`. `raeumeSeiteAuf()` leert
  `contentRoot.innerHTML` bei jedem Tab-Wechsel vollständig, die drei
  Zustände treten nie gemischt auf).

**Eigener Fehlversuch, per Test selbst widerlegt (Transparenz wie bei
früheren Etappen):** Erste Fassung von `#app-content` enthielt zusätzlich
`min-height:0` (reflexhaft als "Flexbox-Best-Practice" ergänzt, ohne
konkreten Anlass). Beim Test bei 1024×700px (kleinerer Laptop-Screen)
zeigte sich: Das Treemap-SVG blieb korrekt bei seiner 480px-Mindesthöhe,
ABER `svgRect.bottom` (669px) lag VOR `footerTop` (646px) - der Footer
überlappte sichtbar den unteren Rand der Visualisierung, statt darunter zu
erscheinen. Ursache: `min-height:0` erlaubt einem Flex-Item, sich unter
die Mindestgröße seines eigenen Inhalts pressen zu lassen; da der Inhalt
(die Grid mit `.viz-inhalt`s 480px-Mindesthöhe) mehr Platz brauchte, als
`body`s Flex-Verteilung `#app-content` zuteilte, ließ sich `#app-content`
kleinrechnen, während der tatsächliche (überlaufende) Inhalt sichtbar
darüber hinausragte (`overflow` ist standardmäßig `visible`) - direkt in
den nachfolgenden Footer hinein. Behoben durch ERSATZLOSES Entfernen von
`min-height:0`: Ohne diese Regel erzwingt der Flex-Algorithmus für
`#app-content` automatisch mindestens die Größe seines Inhalts (Standard-
Verhalten `min-height:auto` bei Flex-Items) - der ganze `#app-content`-Block
(und damit `body`) wächst dann korrekt über die Viewport-Höhe hinaus, der
Footer wird im normalen Fluss nach unten verschoben, die Seite scrollt -
exakt das in Schritt 3 verlangte Verhalten. Erneut bei 1024×700 UND bei
1920×1080 gegengeprüft: kein Überlappen mehr, korrektes Scrollen nur dort,
wo tatsächlich nötig.

**Konkrete Schwellenwert-Messung (Schritt 3, wie im Auftrag verlangt "bitte
zurückmelden, ab welcher Breite/Höhe der Fallback greift"):** Bei ≥700px
Breite (Header bleibt einzeilig) per Bisektion gemessen: bei 745px
Viewport-Höhe genau kein Scroll (`scrollHeight === innerHeight`), bei 660px
bereits Scroll nötig - die Treemap (die zusätzlich noch ihre EIGENE interne
Werkzeugleiste über `.treemap-svg-bereich` trägt, siehe oben) braucht damit
mindestens ca. 745px Viewport-Höhe, um ohne Seiten-Scroll auszukommen;
Module ohne eigene interne Werkzeugleiste (z. B. Sunburst) kommen mit
entsprechend weniger aus. Keine neue Breiten-Schwelle eingeführt - Breite
war schon vorher fließend bis zu jeder Fenstergröße; das
bestehende `@media (max-width:700px)`-Verhalten (Header-Umbruch,
`KLEINER_BILDSCHIRM_SCHWELLE` für Personennetzwerk/Gantt-Hinweis) bleibt
unverändert bestehen und wurde erneut geprüft (Hinweis erscheint weiterhin
korrekt bei schmalen Fenstern).

**Testmethodik-Hinweis:** Erneut das bereits bekannte Browser-Caching-
Problem angetroffen (server-seitig frischer Inhalt per `fetch(...,
{cache:'no-store'})` bestätigt, trotzdem stale gerenderte Breite/Höhe im
bereits offenen Tab) - diesmal bei CSS, nicht nur bei JS-Modulen wie in
früheren Etappen. Wieder durch Wechsel auf einen neuen, in dieser Sitzung
nie zuvor genutzten Port gelöst. Zusätzlich festgestellt: Das
Viewport-Resize-Testwerkzeug selbst löst KEINEN echten `window`-`resize`-
DOM-Event aus (reine CDP-Viewport-Emulation) - die Größe der Seite ändert
sich zwar sichtbar, aber `app.js`s `window.addEventListener('resize', ...)`
feuert dadurch nicht automatisch. Für den Resize-Infrastruktur-Test daher
zusätzlich `window.dispatchEvent(new Event('resize'))` manuell ausgelöst -
danach griff die bestehende 200ms-Debounce/Generation-Counter-Kette
korrekt und aktualisierte das SVG auf die neue Containergröße. Eine
Eigenschaft des Testwerkzeugs, kein Fehler der Anwendung.

**Verifikation (echter Server, frische Tabs, drei Viewport-Größen plus
Zwischenwerte für die Schwellenwert-Suche):**
- 1920×1080: Treemap-SVG 1068×480px → 1888×821px (≈3× Fläche), Header/
  Footer nicht überdeckt, Werkzeugleiste einzeilig.
- 1024×700: 480px-Mindesthöhe korrekt aktiv, Seite scrollt, kein Überlappen
  (nach Behebung des `min-height:0`-Fehlversuchs).
- 375px Breite: Werkzeugleiste bleibt einzeilig (142px-Button + 236px-
  Dropdown passen nebeneinander), Header wächst korrekt durch Umbruch
  (61px → 158px), kein Überlappen, kein zusätzlicher Scroll nötig bei
  ausreichender Höhe (906px in diesem Test).
- Resize-Infrastruktur: bestehende Debounce/Generation-Counter-Kette
  unverändert funktionsfähig (siehe Testmethodik-Hinweis oben).
- Stichprobe weiterer Module: Sunburst/Icicle/CirclePacking (SVG auf
  1888×873 gewachsen, KEINE Modul-Änderung nötig, wie durch die
  Root-Cause-Analyse vorhergesagt), Zeitachse (Breite 1888px, Höhe bewusst
  unverändert datengetrieben), Regesten-Kachelraster (großer, absichtlich
  scrollender Inhalt, unverändertes Verhalten bestätigt), Karte/Leaflet
  (1888×460px, kein Rendering-Fehler). Kachelauswahl- und Platzhalter-Tabs
  ebenfalls geprüft (volle bzw. auf 700px begrenzte Breite).
- Bereits behobene Interaktionen (Unsicherheiten-Toggle via `resize()`,
  Sidebar-Toggle bei Wiederklick auf dieselbe Kachel) erneut nach der
  Layout-Änderung getestet: beide unverändert funktionsfähig.
- Keine Konsolenfehler auf jeder getesteten Seite/Größe.

---

## 2026-09-05 (3) – Bestandsverzeichnis-Treemap: zwei Interaktions-Bugs (Uncertainty-Button, Sidebar-Toggle)

**Betrifft:** `js/core/app.js` (zwei Stellen), `js/viz/treemap.js`. Kurzfassung
in `CHANGELOG.md`, hier die Herleitung.

**Auftrag kam mit einer expliziten Vorgabe:** Falls die Ursache für den
Unsicherheiten-Button-Bug in einer zentralen, modulübergreifenden Datei liegt
(explizit `app.js` als Beispiel genannt), soll das identifiziert und benannt
werden, BEVOR dort geändert wird - nicht stillschweigend mitändern. Genau
dieser Fall trat ein.

**Punkt 1, Diagnose:** `js/core/unsicherheitsButton.js` selbst ist korrekt -
es toggelt nur `state.js`s `unsicherheitModusAktiv` und ruft ein übergebenes
`onToggle(aktiv)` auf, ohne selbst irgendetwas über Navigation zu wissen. Die
eigentliche Verdrahtung liegt in `js/core/app.js`, an ZWEI identischen
Stellen (`renderBestandTab()` Zeile ~157 und `renderVisualisierungenTab()`
Zeile ~221, je einmal pro Tab): `onToggle: (aktiv) =>
kontext.aktuellesVizModul?.render(vizContainer, records, { showUncertainty:
aktiv })`. Das ist ein vollständiger `render()`-Aufruf, nicht `resize()`. Der
Modul-Vertrag (Abschnitt 5, in mehreren Modulen wörtlich referenziert)
unterscheidet die beiden bewusst: `render()` initialisiert ein Modul komplett
neu, `resize(optionen)` aktualisiert nur die Optionen und zeichnet neu, ohne
internen Zustand zu berühren. Bei `treemap.js` heißt "interner Zustand"
konkret `instanz.aktuelleKategorieDaten` (Ebene 1/2) und
`instanz.ausgewaehlterName` - ein `render()`-Aufruf baut `instanz` in
`render()` komplett neu auf (`aktuelleKategorieDaten: null` im Objektliteral),
daher der beobachtete Sprung zur Wurzel.

Vor Änderung an `app.js`: geprüft, ob alle 31 Viz-Module tatsächlich
`resize()` implementieren (`grep -l "export function resize"` über
`js/viz/*.js` → alle 31 Treffer) und ob das Muster einheitlich ist
(`sunburst.js` stichprobenartig gelesen: identisch zu `treemap.js`s
`resize(neueOptionen = {}) { instanz.options = {...instanz.options,
...neueOptionen}; zeichneX(); }`). Dem Auftraggeber das Ergebnis vorgelegt
(Root Cause + Vorschlag, beide Stellen in `app.js` auf `resize()`
umzustellen) - explizit bestätigt bekommen, bevor die Änderung vorgenommen
wurde.

**Punkt 1, Fix:** Beide Stellen in `app.js` von `.render(vizContainer,
records, { showUncertainty: aktiv })` auf `.resize({ showUncertainty: aktiv
})` umgestellt. Da der Vertrag für alle 31 Module einheitlich gilt, profitiert
nicht nur die Treemap: Jedes Modul mit eigenem internen Zustand (Zoom,
Auswahl, Filter, Layout-Cache) behält diesen jetzt beim Umschalten der
Unsicherheiten-Anzeige, statt bei jedem Toggle komplett neu aufgebaut zu
werden.

**Punkt 2, Diagnose:** Vollständig innerhalb `treemap.js`, keine Fremdursache.
`waehleBestandAus(datenKnoten)` setzte bislang unbedingt
`instanz.ausgewaehlterName = datenKnoten.name` und rief `oeffneSidebar(...)`
auf - unabhängig davon, ob genau dieser Bestand bereits ausgewählt war. Kein
State-Vergleich vor dem Öffnen.

**Punkt 2, Fix:** Vergleich gegen `instanz.ausgewaehlterName` (dieselbe
Vergleichsbasis, die bereits für die Auswahl-Hervorhebung in
`zeichneEineKachel()` verwendet wird - keine neue State-Quelle eingeführt).
Ist die angeklickte Kachel bereits ausgewählt: `ausgewaehlterName` auf `null`,
neu zeichnen (entfernt die Hervorhebung), `schliesseSidebar()`. Andernfalls
unverändertes bisheriges Verhalten. Dabei einen zweiten, kleineren Fehler
gefunden und mitbehoben: Da der auslösende Klick von der durch
`zeichneTreemap()` gleich darauf zerstörten Kachel selbst kommt (nicht vom
Sidebar-eigenen ×-Button), greift `schliesseSidebar()`s interne
Fokus-Rückgabe nicht (sie prüft nur `sidebar.contains(document.activeElement)`
- das war hier nie der Fall, der Fokus saß ja auf der SVG-Kachel, nicht in der
Sidebar). Ohne Gegenmaßnahme wäre der Fokus nach dem Entfernen der Kachel auf
`<body>` verwaist. `waehleBestandAus()` holt ihn beim Schließen jetzt explizit
mit `instanz.svgBereich.focus()` zurück - dasselbe bereits für genau diesen
Zweck vorhandene `tabindex="-1"` auf `svgBereich` (siehe `render()`), das
schon an anderer Stelle (`schliesseSidebar()` selbst, `wechsleZuWurzel()`
indirekt) als Fokus-Ziel dient.

**Bekannte, unverändert bestehende Einschränkung:** Die bereits in der
Überarbeitungs-Etappe dokumentierte Namens-Kollision (zwei unterschiedliche
Bestände mit demselben `record.name`, real bestätigt: zweimal „Grundbücher"
in „Stadt und Raum") wirkt sich jetzt auch auf den neuen Toggle aus - ein
Klick auf den zweiten gleichnamigen Bestand wird wie ein erneuter Klick auf
den ersten behandelt (schließt statt zu öffnen). Das ist keine neue
Regression, sondern dieselbe vorbestehende, bereits als Folgeauftrag
vorgeschlagene Einschränkung (Wechsel von `record.name`- auf
`record.kuerzel`-Matching) - beim Testen konkret reproduziert
(`kacheln[1]` in „Stadt und Raum" traf zufällig die zweite „Grundbücher"-
Kachel), nicht als neuer Fehler gewertet.

**Verifikation (echter Server, frischer Browser-Tab, echte Daten):** Punkt 1:
Ebene-2-Titel/Kachelanzahl bleiben über zwei Toggle-Zyklen (an/aus) unverändert,
`aria-pressed`/Beschriftung korrekt. Punkt 2: Klick auf ausgewählte Kachel
schließt Sidebar UND setzt Fokus auf `svgBereich` (nicht `<body>`, explizit
geprüft); Klick auf andere Kachel bei offener Sidebar aktualisiert Titel/Inhalt
korrekt, ohne Zwischenschritt. Regressionstest: Zurück-Button (13
Kategorie-Gruppen, Titel leer, Sidebar automatisch geschlossen),
Kategorie-Hover-Hervorhebung (`stroke-width` 2.5→4.5→2.5), Mindesthöhen-
Korrektur aus der letzten Etappe (weiterhin 0 Kacheln außerhalb der
Kategorie-Fläche - keine neue Regression bei den zuvor behobenen
Überlappungen), `resize()` (SVG-Maße ändern sich korrekt), `destroy()`
(Container vollständig geleert) - alle bestanden, keine Konsolenfehler.
Zusätzlich `sunburst.js` als zweites, von der `app.js`-Änderung mitbetroffenes
Modul stichprobenartig geprüft (Pfadanzahl vor/nach Toggle unverändert, kein
Rendering-Fehler) - da die Änderung in `app.js` alle 31 Module betrifft, aber
nur eine begrenzte Stichprobe zusätzlich zur Treemap getestet werden konnte.

---

## 2026-09-05 (2) – Bestandsverzeichnis-Treemap: Regression aus dem Duplikat-Fix

**Betrifft:** `js/viz/treemap.js`, nur `korrigiereMindesthoehen()`. Kurzfassung
in `CHANGELOG.md`, hier die vollständige Herleitung inkl. des ersten,
gescheiterten Korrekturversuchs.

**Meldung (Auftraggeber, nach Screenshot):** Der Stapel-Fix aus dem vorherigen
Eintrag (unten) erzeugte in "Vermögen und Finanzen" und "Verwaltung" sichtbar
abgetrennte schmale Streifen aus vielen winzigen Kacheln - ausdrücklicher
Auftrag, die Root Cause zu klären statt punktuell nachzubessern, mit drei
konkreten Fragen (Anzahl betroffener Kacheln/Deckungsgleichheit mit den
vorherigen Duplikaten; warum ein so schmaler Bereich statt proportionaler
Platzierung; Zusammenhang mit der Mindesthöhen-Korrektur der vorletzten
Etappe).

**Diagnose, Schritt für Schritt, per direktem DOM-Zugriff auf die echten
Daten (Canvas 1068×480px, nicht angenommen):**

1. `g.bestand-kachel`-Elemente in "Vermögen und Finanzen" ausgelesen
   (`transform`+`rect`-Attribute): 22 von 153 Kacheln lagen außerhalb der
   eigenen Kategorie-Fläche (`y0` bis -522px - fast 550px über dem
   sichtbaren Bereich, der nur 480px hoch ist). "Verwaltung": 1 von 63,
   22px über der eigenen Fläche. Der bereits bekannte Restfund (identische
   Positionen) bestand ebenfalls weiterhin (1 Paar in "Vermögen und
   Finanzen").
2. Über `element.__data__` die tatsächliche d3-Hierarchie-Struktur der
   betroffenen Kacheln ausgelesen (nicht nur die Bildschirmposition): ALLE
   22 außerhalb liegenden Kacheln gehörten zur selben Unterkategorie
   "Öffentliches Vermögen" (depth 2), deren eigener Bereich nur
   `y0=22` bis `y1=468` (446px) umfasst - bei **109 direkten Bestand-
   Kindern**. Eine harte 24px-Mindesthöhe für alle 109 gleichzeitig hätte
   2616px benötigt, mehr als das 5-fache der tatsächlich vorhandenen
   Fläche - rechnerisch unmöglich, unabhängig von der konkreten
   Implementierung.
3. Die y-Bereiche der außerhalb liegenden Kacheln bildeten, nach x0
   sortiert, eine LÜCKENLOSE Kette (z. B. endete die x0=311-Gruppe exakt
   bei y=-186, wo die x0=346-Gruppe bei y=-186 bis -210 nahtlos
   weiterlief) - das erklärt, warum der Effekt wie EIN zusammenhängender
   "Streifen" aussah, obwohl er aus mehreren, ursprünglich an ganz
   unterschiedlichen x-Positionen sitzenden Bestand-Gruppen bestand: der
   Stapel-Cursor der vorherigen Korrektur ignoriert die x-Position
   komplett und subtrahiert pro betroffener Zelle unbegrenzt 24px von
   einem gemeinsamen Cursor, ohne zu prüfen, ob der benötigte
   Gesamtplatz überhaupt im Elternbereich vorhanden ist.

**Erster Korrekturversuch (verworfen, per Test selbst als unzureichend
erkannt):** Cursor hart auf `knoten.y0`/`knoten.y1` begrenzt, Zellhöhe bei
Bedarf gleichmäßig verkleinert, Platzbedarf anteilig von allen (nicht nur der
einen größten) Geschwistern geliehen. Nach Deployment gegen die echten Daten
erneut geprüft: identisches Ergebnis wie vorher (22 außerhalb, gleiche
Werte) - zunächst fälschlich als Modul-Caching-Problem vermutet (siehe
Testmethodik-Hinweis im Eintrag unten), per `import(url + '?bust=' +
Date.now())` und direktem `render()`-Aufruf auf einer frischen Test-Bench
jedoch zweifelsfrei als ECHTER Logikfehler bestätigt: Die
Verfügbarkeits-Berechnung (`unteresLimit - oberesLimit`) verwendete die
GESAMTE Elternhöhe, ohne zu berücksichtigen, dass die nicht-betroffenen
Geschwister diese Fläche bereits belegen - bei "Öffentliches Vermögen"
suggerierte das 440px "verfügbar", obwohl real nur der nach Abzug der
tatsächlich schon platzierten großen Geschwister übrigbleibende (viel
kleinere und geometrisch nicht einfach zusammenhängende) Rest zur Verfügung
steht. Ein gemeinsamer, x-unabhängiger Stapel-Cursor kann außerdem
grundsätzlich nicht ausschließen, mit anderen Geschwistern an gleicher
Y-, aber anderer X-Position zu kollidieren - genau das erzeugte auch den
weiterhin bestehenden Duplikat-Fall.

**Endgültige, verifizierte Lösung:** Die Fallunterscheidung wird auf ihren
einzigen sicher lösbaren Fall zurückgeführt. Genau EINE zu niedrige
Geschwisterzelle: unverändert wie in der vorletzten Etappe (Leihen von der
größten Geschwisterzelle, an den unteren Rand gesetzt) - das war nie das
Problem und bleibt bestehen. MEHRERE gleichzeitig zu niedrige Geschwister:
keine Verschiebung mehr. d3.treemap() garantiert bereits von sich aus eine
überlappungsfreie Aufteilung aller Geschwister; jeder Versuch, das per
Post-Processing zu einer harten 24px-Untergrenze für ALLE gleichzeitig zu
verschärfen, bricht diese Garantie zwangsläufig, sobald die Kinderzahl die
verfügbare Fläche geometrisch übersteigt (wie bei "Öffentliches Vermögen"
nachgewiesen). Das ist eine bewusste, dem Auftraggeber transparent zu
meldende Rücknahme der in Punkt 4 der Überarbeitung verlangten "harten"
24px-Untergrenze für den Fall extrem dichter Unterkategorien - keine
still vorgenommene Abschwächung.

**Verifikation (echte Daten, 1068×480px, alle 13 Kategorien, per
cache-umgehendem `import()` UND per echtem neuen Browser-Tab
gegengeprüft):** 0 Kacheln außerhalb ihrer Kategorie-Fläche, 0 echte
Rechteck-Überlappungen (vorher: 22 außerhalb allein in "Vermögen und
Finanzen", bis 522px). Verbleibend unter 24px, ausschließlich in den
dichtesten Unterkategorien: 41/153 in "Vermögen und Finanzen", 18/63 in
"Verwaltung". Navigation erneut smoke-getestet: Kategorie-Drilldown (Titel
wechselt korrekt, Kachelanzahl passt), Bestand-Klick öffnet Sidebar mit
korrektem Titel, Zurück-Button stellt alle 13 Kategorie-Gruppen wieder her.

**Testmethodik-Hinweis (Ergänzung zum Eintrag unten):** Das bereits bekannte
Modul-Caching-Problem trat diesmal in einer neuen Form auf: Trotz frischer
`fetch(url, {cache:'no-store'})`-Bestätigung UND frischer 200-OK-
Netzwerk-Requests (nicht 304) lieferte ein per `navigate({force:true})`
erneut geladener Tab weiterhin die ALTE Kachel-Geometrie. Erst der Wechsel
auf einen neuen, in dieser Sitzung nie zuvor genutzten Port UND zusätzlich
ein `import(url + '?bust=' + Date.now())` (statt eines erneuten vollen
Seiten-Reloads) lieferte zuverlässig den tatsächlich aktuellen Modul-Stand -
zur Kontrolle zusätzlich in einem komplett neuen, zuvor unbenutzten Browser-
Tab (einmaliger, "natürlicher" erster Seitenaufruf ohne jede Wiederholung)
bestätigt, um auszuschließen, dass der Effekt nur ein Artefakt des
wiederholten Test-Navigierens ist.

---

## 2026-09-05 – Bestandsverzeichnis-Treemap: drei aus dem Screenshot gemeldete Punkte

**Betrifft:** `js/viz/treemap.js`. Kurzfassung in `CHANGELOG.md`, hier die
Herleitung.

**Punkt A war der ergiebigste Fund:** zwei UNABHÄNGIGE, echte Fehler, nicht nur
einer. Zuerst per Minimalbeispiel nachgewiesen, dass `d3.treemap().paddingTop()`
entgegen der Annahme bei JEDEM Knoten mit Kindern erneut reserviert wird, nicht
nur einmal auf Kategorie-Ebene - bei "Stadt und Raum" (wenige, kleinteilige
Unterkategorien) blieb dadurch fast kein Platz für die Bestände übrig. Danach,
selbst nach Behebung dieses ersten Fehlers, zeigte "Stadt und Raum" immer noch
identisch positionierte, sich gegenseitig verdeckende Kacheln - zweiter,
unabhängiger Fund: die Mindesthöhen-Korrektur aus der vorherigen Etappe
(„Defizit von der größten Geschwisterzelle abziehen") setzte bei MEHREREN
gleichzeitig betroffenen Geschwistern alle auf dieselbe berechnete Position,
statt sie zu stapeln. Beide unabhängig behoben, Ergebnis verifiziert: Zellen
unter 24px von 115 auf 0, Positions-Duplikate von 24 auf 2 (letztere korrekt
groß, nicht mehr entartet - als Restfund dokumentiert, nicht weiter verfolgt).

**Testmethodik-Hinweis, unerwartet aufwendig:** In dieser Sitzung erwies sich
der `<link>`/Modul-Cache dieser Browser-Instanz als ungewöhnlich hartnäckig -
weder ein erzwungener Reload noch ein `location.reload()` genügten zwischen-
zeitlich, um eine geänderte `treemap.js` tatsächlich neu zu laden (per
`fetch(..., {cache:'no-store'})` mehrfach bestätigt: der Server hatte den
aktuellen Stand, die ausgeführte Seite nicht). Nur ein komplett neuer
Server-Port (neue Origin) hat zuverlässig funktioniert. Zusätzlich führte
eigenes Testverhalten (mehrere `treemap.render()`/`destroy()`-Aufrufe auf
temporären Bench-Elementen, die sich das modul-interne `instanz`-Singleton mit
der echten App teilen) zwischenzeitlich zu einem scheinbaren Totalausfall
(0 Kacheln) - lag an liegengebliebenen Test-DOM-Resten und unscoped
`document.querySelector()`-Aufrufen im eigenen Testskript, nicht an
`treemap.js` selbst; nach Bereinigung und frischem Reload bestätigt korrekt.

**Punkt B:** konkrete Zahlen statt Beschreibung geliefert (wie gefordert) -
`.value`-Verhältnis exakt 4,00:1, tatsächliche Pixelfläche 4,19:1 (Abweichung
durch Seitenverhältnis-Packung, nicht durch die Skalierung selbst).

**Punkt C:** Scope-Klarstellung des Nutzers angenommen (Ebene 1 zusätzlich zu
Ebene 2) - der volle Name war technisch bereits über die bestehende
600ms-Kategorie-Fläche erreichbar, aber nicht "analog" (sofort) wie gefordert.
Ergänzt: nur die abgeschnittene Pille selbst bekommt einen eigenen, sofortigen
Tooltip + Klick-Handler, unabhängig von der weiterhin bestehenden
600ms-Verzögerung für den Rest der Kategorie-Fläche.

**Vollständig regressionsgetestet nach allen drei Korrekturen:** Wurzel-/
Kategorie-Ansicht, Sidebar (inkl. Fokus-Wanderung), `resize()`/`destroy()`,
Zurück-Button, Kategorie-Gruppen-Hover (Punkt 3 aus der vorherigen Etappe),
Legende weiterhin entfernt - alles weiterhin korrekt, keine Konsolenfehler.

---

## 2026-08-27 – Bestandsverzeichnis-Treemap: Überarbeitung (Farbe, Größe, Interaktion, Beschriftung, Legende)

**Betrifft:** `js/viz/treemap.js` (überarbeitet), `js/utils/bestandsHierarchie.js`
(additiv erweitert - `mindestgroesse`-Parameter mit unverändertem Default,
`OHNE_KATEGORIE` neu exportiert). Kurzfassung in `CHANGELOG.md` (neu angelegt).

**Zwei Rückfragen vor Beginn geklärt (beide vom Nutzer entschieden):**
1. Root Cause der Größenverzerrung verifiziert statt angenommen: der bisherige
   `MINDESTGROESSE=10`-Floor in `bestandsHierarchie.js` floort bei der realen
   Werteverteilung (Median 0,2 lfm, 286 von 288 Werten ≤ 10) praktisch alle
   Bestände auf denselben Wert. Entscheidung: kein Eingriff am gemeinsamen
   Default (betrifft sonst sunburst/icicle/circlePacking/ganttDiagramm), aber
   `baueBestandsHierarchie()` bekommt einen optionalen zweiten Parameter
   `mindestgroesse` (Default weiterhin 10) - `treemap.js` übergibt eigenständig
   0,05 (unter dem kleinsten real vorkommenden Wert 0,1, damit Bestände ohne
   Wert nie größer wirken als der kleinste echte). Rückwärtskompatibilität
   nicht nur angenommen, sondern verifiziert: `baueBestandsHierarchie(records)`
   ohne zweites Argument liefert vor/nach der Änderung identische `.value`-
   Werte für alle Blätter; `sunburst.js` zusätzlich tatsächlich gerendert
   (Segmentanzahl unverändert >300).
2. Lineare vs. milde Quadratwurzel-Skalierung bei einem Verhältnis von 183:1 -
   Nutzer entschied sich für Quadratwurzel (reduziert das Extremverhältnis auf
   ca. 13,5:1, bleibt streng monoton).

**Faktenkorrektur vor Beginn (informativ, nicht blockierend):** Der in den
Nicht-Zielen erwähnte "Zeitspannen-Slider (25-Jahres-Blöcke, 1100–2025)"
existiert weder im aktuellen `treemap.js` noch im alten Single-File-Interface
(beide durchsucht, keine Treffer) - nichts zum Erhalten vorhanden.

**Ein Zwischenfund während der Umsetzung, korrigiert bevor er ausgeliefert
wurde:** Die erste Fassung der kategorialen Farbskala (Farbton gleichmäßig
verteilt, Helligkeit in zwei Stufen alternierend) erzeugte bei einer
Violett-Kategorie nach Unterkategorie-Abstufung eine Farbe mit nur 4,32:1
Kontrast (unter der 4,5:1-Anforderung) - Ursache: die WCAG-Formel gewichtet
Blau nur mit 0,0722, wodurch manche Blau-/Violetttöne dunkler wirken als ihre
HSL-Helligkeit vermuten lässt. Behoben durch einen Selbstkorrektur-Mechanismus
(`garantiereKontrast()`), der jede erzeugte Farbe nötigenfalls in kleinen
Schritten weiter Richtung Schwarz oder Weiß verschiebt, bis mindestens eine
Textfarbe 4,5:1 erreicht - danach erneut gegen alle 26 tatsächlich
vorkommenden Hintergrundfarben getestet, schlechtester Wert jetzt 4,64:1.

**Ein zweiter Zwischenfund, ebenfalls vor Auslieferung korrigiert:** Die
Kategorie-weite Hover-/Fokus-Hervorhebung (Punkt 3) war zunächst per CSS
`:hover`/`:focus-within` umgesetzt. Ein direkter Vergleichstest (Selektor mit
Klasse statt Pseudoklasse, ansonsten identisch) zeigte: die Kaskaden-Logik
selbst war korrekt, aber sobald ein Element zusätzlich ein SVG-
Präsentationsattribut trägt (wie `stroke-width`, von D3 per `.attr()` gesetzt),
gewinnt in dieser Laufzeitumgebung nachweislich das Attribut gegen die reine
CSS-Regel - bestätigt an einem isolierten Minimalbeispiel (mit Attribut:
Override schlägt fehl; ohne Attribut: identische Regel funktioniert
einwandfrei). Umgestellt auf den im Projekt bereits bewährten Ansatz
(`mouseenter`/`mouseleave`/`focusin`/`focusout` + `.attr()`, wie bei Tooltip
und Auswahl-Rahmen) - per echtem Event-Dispatch verifiziert: Hover UND
Tastatur-Fokus lösen die Hervorhebung korrekt aus und beenden sie korrekt.

**Gefunden, aber bewusst nicht behoben (siehe CHANGELOG.md für Details, war
nicht Teil des Auftrags):** Die Auswahl-Hervorhebung matcht über
`record.name`, nicht über einen eindeutigen Schlüssel - zwei real
existierende Bestände teilen sich den Namen "Steuerbücher" innerhalb
derselben Kategorie, wodurch beim Testen zwischenzeitlich zwei statt einer
Kachel als "ausgewählt" markiert wurden. Als Fund dokumentiert, nicht
eigenmächtig behoben (nicht Teil der fünf beauftragten Punkte).

**Getestet (automatisiert gegen echte Daten, `bestandsverzeichnis.csv`):**
Größenverteilung (68 unterschiedliche gebuckelte Flächengrößen statt vorher
fast durchgängig identisch), 13 Kategorien inkl. "ohne Kategorie" mit
eindeutigen Rahmenfarben, 7 Bestände mit "ohne Kategorie"-Punktmuster,
WCAG-Kontrast für alle 26 tatsächlich erzeugten Hintergrundfarben ≥ 4,5:1,
Gruppen-Hervorhebung per Event-Dispatch (Hover und Tastatur-Fokus,
funktionierend + korrekt zurückgesetzt), keine Umfangsangabe und keine
"…"-Abschneidung mehr in Beschriftungen, Mindestschriftgröße 11px, Legende
vollständig entfernt (0 Treffer), volle Klickdurchlauf-Regression
(Wurzel→Kategorie→Sidebar→resize→Zurück→destroy, inkl. Fokus-Wanderung zum
Sidebar-Titel) weiterhin bestanden, volle Integration über die echte App
bestätigt. Keine Konsolenfehler während des gesamten Durchlaufs.

---

## 2026-08-13 – Teil B: Treemap-Feature-Nachbau aus dem alten Interface

**Betrifft:** `js/viz/treemap.js` (vollständig neu aufgebaut, ca. 550 Zeilen,
deutlich über der 100-Zeilen-Obergrenze für EINE Funktion, aber in ca. 30 kleine
Funktionen zerlegt - keine einzelne Funktion überschreitet die Grenze).

**Vorlage:** `Desktop/GitHub/Interface-Krems/index.html`, `initTreemap()`
(Zeile ~3552 ff.) - Architektur direkt übernommen: Wurzel-Ansicht rendert ALLE
Bestand-Blätter direkt (nicht aggregierte Kategorie-Kacheln), mit einer separaten
Kategorie-Umrandung + farbiger Namens-Pille als visueller Overlay-Layer; Klick
auf eine Bestand-Kachel ODER die unsichtbare Kategorie-Klickfläche zoomt in die
Kategorie-Ansicht. `daten_unsicher` bleibt dabei durchgängig eine
Zellen-Eigenschaft, keine eigene Kategorie (anders als die alte "Unsicher"-
Pseudo-Kategorie).

**Anpassungen an aktuelle Regeln (wie beauftragt):**
- Tooltip: `zeigeTooltip()`/`versteckeTooltip()` aus `tooltip.js`, keine
  Eigenbau-Lösung. 600ms-Delay auf der Wurzel-Ansicht lokal per `setTimeout()`
  um den Aufruf herum, der gemeinsame Tooltip-Vertrag selbst bleibt
  unverändert. Kategorie-Ansicht: sofort (kein Delay), wie beauftragt.
- Legende: echte `<button>`-Elemente (`role="listitem"` in `role="list"`-
  Container, exakt das bereits in `kachelauswahl.js` etablierte Muster) -
  keine manuelle Tastatur-Behandlung nötig, kommt mit `<button>` automatisch.
- Keine `window.*`-Zuweisungen - programmatisch per Test bestätigt (siehe unten).
- Sidebar ohne Fotobereich, Inhalt aus den in `SCHEMA.md` als "für Sidebar"
  markierten `bestand.csv`-Feldern (Zitierweise/Kurzbeschreibung/Form und
  Inhalt/Bestandsgeschichte/Abgebende Stelle/Provenienz/Biografische Angaben/
  Materialart/Sprache-Schrift/Literaturhinweis/Veröffentlichungen/Vorgänger/
  Nachfolger als reiner Verweistext), `bkk_kategorie`/`bkk_unterkategorie` als
  farbige Badges. Leere Felder werden nicht angezeigt (kein "–"-Platzhalter,
  entspricht der bereits in `regestenKachelraster.js` etablierten Konvention
  für optionale Listenfelder), anders als die alte Sidebar mit festen
  "–"-Platzhaltern für jedes Feld.

**Eine bewusste Umsortierung der Zeichenreihenfolge gegenüber dem alten Code:**
im Original liegt die unsichtbare Kategorie-Klickfläche in der Wurzel-Ansicht
ÜBER den Bestand-Kacheln (später im DOM), fängt Klicks/Hover technisch auch für
Bereiche ab, die eigentlich zu einer Kachel gehören. Hier stattdessen VOR den
Kacheln gezeichnet (liegt darunter) - fängt nur Lücken zwischen Kacheln und die
Beschriftungs-Pille ab, echte Kachel-Treffer gehen direkt an die jeweilige
Kachel. Funktional identisch (beide Wege lösen denselben Kategorie-Wechsel
aus), aber sauberer nachvollziehbar. Kategorie-Klickfläche zusätzlich per
`focus`/`blur` an denselben 600ms-Tooltip gekoppelt (im Original nur
`mouseenter`/`mouseleave`) - sonst wäre der Wurzel-Ansicht-Tooltip für
Tastaturnutzer*innen unerreichbar gewesen, was dem eigenen Tooltip-Vertrag aus
Abschnitt 5b widersprochen hätte.

**Warnsymbol-Position angepasst:** Im aktuellen (Vor-Teil-B) `treemap.js` stand
das ⚠-Symbol oben links, mit der Beschriftung darunter verschoben. Der neue
Auto-Fit-Text beginnt selbst oben links - das Symbol wandert daher nach oben
rechts, um nicht zu kollidieren.

**Bekannte, nicht behobene Grenze des Mindesthöhen-Algorithmus (bitte zur
Kenntnis nehmen):** Die Post-Layout-Korrektur ("Defizit von der größten
Geschwisterzelle abziehen") wurde exakt wie im alten Interface übernommen,
unverändert. Gegen die echten 329 Bestände getestet: von 62 ursprünglich zu
niedrigen Zellen bleiben nach der Korrektur 36 unter 24px, einige davon bei
0px. Ursache liegt nicht in der Portierung, sondern ist eine mathematische
Grenze des Verfahrens selbst: Eine Unterkategorie mit 56 Bestand-Geschwistern
bei nur 154px verfügbarer Höhe kann unmöglich jedem Kind 24px zuteilen, egal
wie das Defizit verteilt wird (56×24px > 154px) - das alte Interface hätte an
denselben realen Daten dieselbe Grenze. Tastaturbedienbarkeit ist davon NICHT
betroffen (Tab/Enter funktioniert unabhängig von der Zellgröße); betroffen ist
ausschließlich die Maus-Klickpräzision bei ca. 11% der Zellen in dicht besetzten
Gruppen. Da der Auftrag "direkt übernehmen, keine Anpassung nötig" lautete,
wurde der Algorithmus nicht eigenmächtig erweitert (z. B. Verteilung über
mehrere Geschwister statt nur die größte) - bitte Rückmeldung, ob das für eine
spätere Etappe gewünscht ist.

**Getestet (automatisiert gegen echte Daten, `bestandsverzeichnis.csv`):**
Wurzel-Ansicht (13 Kategorie-Klickflächen, 329 Kacheln, 13 Rahmen) → Klick auf
Kategorie-Fläche → Kategorie-Ansicht (Root-Overlays korrekt weg, Zurück-Button
sichtbar, Titel korrekt) → Tooltip sofort sichtbar (nach 50ms, ohne 600ms-Delay)
→ Klick auf Bestand → Sidebar offen, Fokus auf Sidebar-Titel bestätigt, kein
Fotobereich, Badges vorhanden, Auswahlrahmen an genau einer Kachel → `resize()`
bei offener Sidebar (bleibt offen, Kacheln korrekt neu gezeichnet) →
Zurück-Button (sofort noch alte Ansicht, nach 250ms+ korrekt zur Wurzel-Ansicht
gewechselt, Sidebar dabei geschlossen) → `destroy()` bei tatsächlich offener
Sidebar (Container komplett leer, Sidebar-Element entfernt, Tooltip versteckt).
Separat verifiziert: Wurzel-Ansicht-Tooltip exakt bei 600ms (nicht bei 300ms)
sichtbar, korrekter Text, verschwindet bei mouseleave. Tastatur: Enter auf
Kategorie-Klickfläche zoomt, Leertaste auf Bestand-Kachel öffnet Sidebar,
Legende-Buttons ohne manuelles `tabindex` (natives Verhalten). Keine
`window.*`-Zuweisungen (`loadSidebarPhotos`/`tmSetSelected`/`tmView` nicht in
`window` gefunden). Volle Integration über die echte App bestätigt: Toggle
über den Unsicherheits-Button, Wechsel zu Sunburst und zurück zu Treemap über
`ansichtWechseln.js` - beide Male sauberes `destroy()`/`render()`, keine
Dopplungen. Keine Konsolenfehler während des gesamten Durchlaufs.

---

## 2026-08-13 – Teil A: Unterkategorie-Ebene in `bestandsHierarchie.js`

**Betrifft:** `js/utils/bestandsHierarchie.js` (zusätzliche Gruppierungsebene,
neue exportierte Funktion `kategorieVonKnoten()`, neue `baueKnotenTooltipText()`),
`js/viz/treemap.js`, `sunburst.js`, `icicle.js`, `circlePacking.js`,
`js/viz/ganttDiagramm.js`.

**Korrektur der Bestandshierarchie (SCHEMA.md):** Gesamtbestand →
`bkk_kategorie` → `bkk_unterkategorie` → einzelner Bestand, vier Ebenen statt
drei. `baueBestandsHierarchie()` gruppiert jetzt zweistufig (verschachtelte
`Map`s), mit Fallback `(ohne Unterkategorie)` analog zum bestehenden
`(ohne Kategorie)`-Fallback, falls `bkk_unterkategorie` leer ist (Abschnitt 12:
nie stillschweigend ausblenden).

**Wichtiger Fund vor Beginn der Arbeit, abweichend von der Auftragsbeschreibung:**
`ganttDiagramm.js` importiert und nutzt `baueBestandsHierarchie()` sehr wohl
(für die Kategorie-Gruppierung/-Färbung der Balken, nicht für die Balkenlänge
selbst) - war entgegen der Annahme "nicht betroffen" tatsächlich betroffen und
hätte mit der neuen vierten Ebene falsch gruppiert/gefärbt (Bestand-Blätter
lagen vorher bei depth 2 mit `.parent` = Kategorie, liegen jetzt bei depth 3
mit `.parent` = Unterkategorie). Wurde mitkorrigiert, siehe unten - sonst wäre
das Modul unbemerkt kaputtgegangen.

**DRY-Konsolidierung:** `sunburst.js`, `icicle.js` und `circlePacking.js`
hatten je eine eigene, identische, depth-basierte lokale Kopie von
`kategorieVonKnoten()` (`d.depth === 1 ? d.data.name : d.parent.data.name`) -
alle drei wären mit der neuen Ebene für Bestand-Blätter falsch gelaufen
(fälschlich die Unterkategorie statt der Kategorie als Farbschlüssel). Durch
eine gemeinsame, über `d.ancestors()` laufende Version in
`bestandsHierarchie.js` ersetzt (tiefen-unabhängig, funktioniert unabhängig
davon, wie viele Ebenen zwischen Knoten und Kategorie liegen) - jetzt an einer
Stelle gepflegt statt an vieren. Ebenso die Tooltip-Verzweigung
"Kategorie: X" vs. Bestand-Tooltip (vorher `d.depth === 1 ? ... : baueTooltipText(d)`,
hätte für die neue Unterkategorie-Ebene fälschlich versucht, `baueTooltipText()`
auf einen Gruppenknoten ohne `.data.record` anzuwenden) - jetzt
`baueKnotenTooltipText()`, unterscheidet über die Anwesenheit von
`.data.record`, nicht über eine Tiefen-Zahl.

**`circlePacking.js` zusätzlich:** Bestand-Namen-Beschriftung nutzte
`d.depth === 2` als Bestands-Ebene-Erkennung - hätte mit der neuen Ebene
Unterkategorie-Kreise statt Bestand-Kreise beschriftet. Ersetzt durch
`!d.children` (robuste Blatt-Erkennung, unabhängig von der tatsächlichen
Tiefe). Deckkraft-Staffelung von zwei auf drei Stufen erweitert
(Kategorie 0.15 / Unterkategorie 0.45 / Bestand 0.85), rein visuelle
Verschachtelungshilfe.

**`treemap.js`:** nur die Farbzuordnung korrigiert (`d.parent.data.name` →
`kategorieVonKnoten(d)`) - minimaler Fix, da die Datei mit Teil B ohnehin
vollständig neu gebaut wird.

**Getestet gegen echte Daten (`bestandsverzeichnis.csv`):** Baum-Tiefen
korrekt 0/1/2/3, 13 Kategorien, 26 Unterkategorien, **329 Bestände als
Blätter** (unverändert, wie bestätigt gefordert), `kategorieVonKnoten()` an
allen Knoten aller drei Nicht-Wurzel-Ebenen auf Korrektheit geprüft (0
Abweichungen), 41 `daten_unsicher=ja`-Blätter konsistent in allen fünf
Modulen markiert, `resize()`/`destroy()` in allen fünf sauber (leerer
Container nach `destroy()`, korrektes Neu-Rendern nach `resize()`). Keine
Konsolenfehler.

---

## 2026-08-12 – CSS-Design-Politur (base.css/layout.css/components.css)

**Betrifft:** `css/base.css`, `css/layout.css`, `css/components.css` (voller
Ersatz der bisherigen minimal-funktionalen Fassung aus Teil C), `index.html`
(Google-Fonts-`<link>` ergänzt), sowie zwei gezielte Wert-Änderungen in
bestehenden `<style>`-Blöcken: `js/core/kachelauswahl.js` und
`js/viz/regestenKachelraster.js` (nur Farb-/Radius-/Abstandswerte, keine
Logik/Struktur/Events geändert - vom Nutzer für diesen Auftrag ausdrücklich
freigegeben, siehe Chat).

**Farb-/Schrift-Herkunft:** Akzentfarbe `#2c4a6e` (+ `#3d6591` als
Hover-Variante) sowie die übrige Palette (`--bg`/`--surface`/`--border`/
`--text`/`--text-muted`) 1:1 aus dem alten Single-File-Projekt übernommen
(`Desktop/GitHub/Interface-Krems/index.html`, `:root`-Block). Kontrast
rechnerisch geprüft (WCAG-Formel, siehe Snapshot-Artefakt): Akzentfarbe als
Text 8.34:1 (auf `--bg`) bzw. 9.08:1 (auf `--surface`), weit über der 4.5:1-
Anforderung - keine Ersatzfarbe nötig. Schriften **Inter**/**Playfair
Display** wie vom Nutzer explizit benannt übernommen - Hinweis: das alte
Projekt selbst nutzte tatsächlich Georgia/system-ui, nicht Inter/Playfair
Display (im alten `:root` als `--font`/`--font-ui` hinterlegt) - die explizite
Namensnennung des Nutzers hat hier Vorrang vor der (unzutreffenden) Prämisse
"wie im alten Projekt".

**Architektur-Klarstellung (mit dem Nutzer per Rückfrage geklärt):**
Kachelauswahl, Regesten-Kachelraster, Ansicht-wechseln-Dropdown und
Unsicherheits-Button stylen sich nicht über components.css, sondern (bis auf
den Button) über eigene injizierte `<style>`-Blöcke aus Teil A. Tatsächlich
betroffen waren am Ende nur zwei Dateien direkt (`kachelauswahl.js`,
`regestenKachelraster.js` - beide setzen tatsächliche Farbwerte);
`ansichtWechseln.js` und `unsicherheitsButton.js` setzen dagegen nur
Layout-Werte (min-height/padding) ohne Farbe und sind vollständig aus
components.css heraus stylebar, ohne sie anzufassen. `tooltip.js` injiziert
gar kein `<style>` (nur inline Positionierung) - das komplette Tooltip-Aussehen
kam vorher aus dem Nichts (keine Hintergrundfarbe, kein Rand) und wurde jetzt
erstmals in components.css definiert.

**Design-Tokens (neu in base.css `:root`):** Farben, Typografie-Skala
(`--fs-*`), Zeilenhöhen, eine Abstands-Skala (`--space-1`…`--space-6`) statt
Zufallswerten, sowie `--unsicher: #c0392b` - bewusst nur referenziert, nirgends
verändert (etablierte Unsicherheits-Kennzeichnung aus allen 31 Modulen,
Abschnitt 11).

**Getestet:**
- Vollständiger Klickdurchlauf über alle fünf Tabs, keine Konsolenfehler.
- WCAG-AA-Kontrast programmatisch berechnet (identische Formel wie
  Handrechnung): Text/Hintergrund 15.97:1, Text/Fläche 17.40:1, Footer-Text
  7.00:1, Akzent als Text 8.34–9.08:1, Weiß auf Akzent 9.08:1 - alle bestehen.
- Kleiner-Bildschirm-Test (<700px): Header stapelt korrekt, kein horizontales
  Scrollen, Kleiner-Bildschirm-Hinweis funktioniert weiterhin live.
- Bestätigt: keine Änderung an HTML-Struktur oder JS-Verhalten (nur CSS-Werte
  in den zwei genannten Dateien).

**Testmethodik-Hinweis (zwei neue Ersatzverifikations-Fälle):**
(1) Der lange laufende Test-Tab dieser Session hatte zu diesem Zeitpunkt
bereits stark veraltete HTTP-gecachte Versionen von CSS- und JS-Dateien -
weder ein erzwungener Reload noch manuelles Cache-Busting der `<link>`-Hrefs
lösten das zuverlässig; erst ein komplett neuer Server-Port (neue Origin, kein
Cache-Overlap) zeigte sofort den korrekten Stand. (2) Der `aria-pressed`-
Zustand des Unsicherheits-Buttons und die Akzentfarbe im aktiven Nav-Link
zeigten kurzzeitig einen alten Zwischenwert - Ursache war `transition:
background-color` in Kombination mit dem bereits bekannten
`document.hidden`-Verhalten des Hintergrund-Tabs (eine mitten in der
Interpolation "eingefrorene" Transition); nach Deaktivieren der Transitions
und einem erzwungenen Reflow bestätigte sich der korrekte Zielwert. Beides
Testumgebungs-Artefakte, keine echten Fehler im CSS.

**Visueller Nachweis:** Da weder der Browser-Pane-Screenshot noch Claude in
Chrome in dieser Session verfügbar waren, wurde ein Artefakt aus echten,
per `outerHTML` aus der laufenden App entnommenen Fragmenten plus dem
tatsächlichen Inhalt der drei CSS-Dateien gebaut (Schriften als Base64
eingebettet, da die Artefakt-CSP Google-Fonts-Requests blockiert) - kein neu
gestaltetes Mockup, sondern ein originalgetreuer Schnappschuss.

---

## 2026-08-11 – Teil C Ergänzung: `resize()`-Verdrahtung, live Kleiner-Bildschirm-Hinweis

**Betrifft:** `js/core/app.js` (kein neues Modul, nur die zwei neuen Funktionen
`planeResizeVerarbeitung()`/`verarbeiteResize()` sowie ein zusätzliches Feld
`kleinerBildschirmHinweis` im jeweiligen Tab-Kontextobjekt).

Ein einziger `window`-`resize`-Listener ruft nach 200ms Pause `resize()` (ohne
Argumente) auf dem gerade aktiven Modul auf - jedes Modul liest dabei intern
frisch `container.clientWidth` neu (`karte.js`/`verbindungskarte.js`/
`bipartiteFlowMap.js` rufen stattdessen Leaflets `invalidateSize()`), `app.js`
muss keine Maße kennen oder mitführen. Debounce nach demselben Muster wie
Standard-Praxis: jedes rohe `resize`-Ereignis setzt nur einen Timer zurück,
erst nach 200ms Ruhe wird tatsächlich neu gerendert.

**Wettlauf-Schutz wiederverwendet, nicht neu erfunden:** derselbe
`generation`-Zähler, der bereits den Lade-Wettlauf (Teil C, erster Eintrag)
absichert, schützt jetzt auch hier - die Generation wird beim jeweils
LETZTEN rohen `resize`-Ereignis vor der Pause festgehalten (nicht erst beim
Timer-Ablauf, das wäre wirkungslos, da zwischen Festhalten und Prüfen dann
keine Zeit vergangen wäre) und beim tatsächlichen Aufruf nach der Pause
gegen den dann aktuellen Stand geprüft. Bei Abweichung (Tab währenddessen
gewechselt) wird der Aufruf stillschweigend übersprungen, nicht in ein
bereits abgebautes Modul gerendert.

**Kleiner-Bildschirm-Hinweis (Abschnitt 4.2) ist jetzt live:** dieselbe
`verarbeiteResize()`-Funktion aktualisiert bei Personennetzwerk/Gantt-Diagramm
auch den Hinweistext, nicht mehr nur beim ursprünglichen Ansichtswechsel.

**Testmethodik-Hinweis:** Das `resize_window`-Werkzeug der Browser-Automatisierung
ändert zwar zuverlässig `window.innerWidth`/die tatsächliche Viewport-Größe,
löst dabei aber kein natives `resize`-Ereignis auf `window` aus (bestätigt durch
Vergleichstest) - ein reiner Werkzeug-/Automatisierungs-Effekt, kein Verhalten,
das ein echter Nutzer beim Ziehen am Fensterrand je erleben würde. Getestet
daher mit `resize_window` (für die reale Breitenänderung) kombiniert mit einem
manuell dispatchten `resize`-Event (um den Listener wie im echten Browser
auszulösen) - dieselbe Art Ersatzverifikation wie bei den `document.hidden`-
Fällen zuvor.

**Getestet, alle vier vom Nutzer verlangten Szenarien:**
1. Treemap: SVG-Breite passt sich nach echter Fenster-Verkleinerung sichtbar an
   (1068px → 868px), ohne Seiten-Neuladen.
2. Gantt-Diagramm: Hinweistext erscheint/verschwindet live beim Über-/
   Unterschreiten der 700px-Schwelle, ganz ohne Ansichts- oder Tab-Wechsel,
   in beide Richtungen bestätigt.
3. Wettlauf: `resize`-Ereignis ausgelöst, unmittelbar danach (noch innerhalb der
   200ms-Pause) zum Visualisierungen-Tab gewechselt - Ergebnis nach der Pause:
   sauberer Kachelauswahl-Zustand, keine Reste des alten Bestand/Gantt-Kontexts
   (kein verwaistes `<svg>`, keine doppelten Bauteile), keine Konsolenfehler.
4. Debounce/Performance: 15 rasch aufeinanderfolgende `resize`-Ereignisse ohne
   Pause dazwischen erzeugten während des Bursts null Neu-Renderings (per
   MutationObserver auf neu eingefügte `<svg>`-Elemente gezählt), exakt eines
   nach Ablauf der Pause - kein Rendern pro Pixel-Schritt.

---

## 2026-08-11 – Teil C: `app.js`-Verdrahtung, `index.html` (neu)

**Betrifft:** neue Dateien `index.html` (Projektwurzel), `js/core/app.js`; erste
Design-Inhalte in den bis dahin leeren `css/base.css`/`css/layout.css`/
`css/components.css` (bewusst minimal-funktional, kein Design-Durchgang - siehe
Kommentarköpfe der drei Dateien).

**Beide Dateien existierten vor Teil C noch gar nicht** - bisher wurde jede
Visualisierung ausschließlich in wegwerfbaren Test-HTML-Dateien mit eigenem
CDN-Gerüst geprüft (siehe Testmethodik in den vorherigen Einträgen). `app.js` ist
damit der erste Ort, an dem die drei Bauteile aus Teil A wirklich mit echtem
`router.js`/`state.js` und den 31 echten Modulen zusammenlaufen.

**Architektur der Tab-Verdrahtung:**
- Fünf Haupttabs über `<nav>`-Links (`#bestand`, `#visualisierungen`,
  `#fuehrungen`, `#literatur`, `#ueber`), `aria-current="page"` markiert den
  aktiven Tab.
- **Bestand-Tab:** immer Treemap als Startansicht, „Ansicht wechseln" zu den
  vier übrigen `BESTAND_ANSICHTEN`.
- **Visualisierungen-Tab:** ohne Archivalientyp-Segment in der URL zeigt
  `kachelauswahl.js` die Kachelübersicht; Klick auf eine Kachel navigiert direkt
  zur `primaeransicht` (Abschnitt 4.2, keine Zwischen-Auswahlseite); danach
  `ansichtWechseln.js` für die 26 Urkunden-Ansichten.
- **Führungen/Literatur/Über:** wie mit dem Nutzer abgestimmt klar
  gekennzeichnete Platzhalter mit jeweils konkretem, ehrlichem Grund (Führungen:
  `data/fuehrungen.csv` existiert nicht; Literatur: Datentabelle vorhanden, aber
  kein Anzeige-Modul, Abschnitt 2 „Content-driven, mit Einschränkung" konsequent
  zu Ende gedacht; Über: Inhalt schlicht noch nicht verfasst) - keine generische
  „Coming soon"-Floskel.

**Zwei technisch nicht-triviale Probleme, die eine naive Verdrahtung falsch
gemacht hätte:**
1. **Doppel-Rendering bei jedem Ansichtswechsel:** `ladeModulUndRender()` ruft
   `navigiereZu()` auf (URL soll den aktuellen Stand widerspiegeln), was einen
   `hashchange` auslöst - ohne Gegenmaßnahme hätte das denselben Wechsel ein
   zweites Mal angestoßen. Gelöst über einen in `app.js` selbst geführten
   Kontext (`aktuellerKontext.ansichtId`), der bei jedem `hashchange` mit der
   Ziel-Ansicht verglichen wird: nur bei echter Abweichung (Browser Zurück/Vor,
   direkt eingegebene URL) wird tatsächlich wieder gewechselt.
2. **Wettlauf bei schnellem Tab-Wechsel während eine CSV/ein Modul noch lädt:**
   ein `generation`-Zähler wird bei jedem vollständigen Tab-Neuaufbau erhöht;
   jede asynchrone Ladefunktion prüft nach jedem `await`, ob ihre Generation
   noch aktuell ist, und bricht sonst ab, statt in einen bereits abgebauten
   Container zu rendern.
3. **Echter Bug gefunden und behoben:** `router.js`s `starteRouter()` wendet den
   Fallback „leerer Hash → `#bestand`" nur intern auf `state.js` an;
   `aktuelleRoute()` (von `app.js` für das Rendering genutzt) liest
   `location.hash` direkt und kennt diesen Fallback nicht - ein frischer Aufruf
   ohne Hash zeigte zunächst „Nicht gefunden" statt der Bestand-Startseite.
   Behoben in `app.js`s Bootstrap (nicht in `router.js` selbst, keine
   Schnittstellenänderung nötig): bei leerem Hash wird explizit einmal zu
   `#bestand` navigiert, nachdem der `hashchange`-Listener bereits registriert
   ist.

**`unsicherheitsButton.js`s `setzeZurueck()` wird bei jedem Ansichtswechsel
aufgerufen** (innerhalb von `ladeModulUndRender`, nach dem Laden des neuen
Moduls) - hält die Button-Beschriftung synchron zu dem `state.unsicherheitModusAktiv`,
das `ansichtWechseln.js` bereits selbst zurückgesetzt hat (siehe Teil A,
Architektur-Klarstellung).

**Getestet (kompletter Klickdurchlauf, wie vom Nutzer priorisiert):**
Startseite → Bestand/Treemap → Sunburst → Gantt-Diagramm (inkl. Unsicherheits-
Toggle bei jeder, Werte deckungsgleich mit den Teil-B-Zahlen) → Visualisierungen-
Tab → Kachelauswahl → Urkunden-Kachel → Regesten-Kachelraster → Ansicht wechseln
zu Karte (86 unsichere Marker), Personennetzwerk (654 unsichere Kanten),
Zeitachse (Toggle bei allen dreien getestet) → zurück zum Bestand-Tab → alle
fünf Haupttabs inkl. Browser-Zurück-Navigation. Kleiner-Bildschirm-Hinweis bei
Gantt-Diagramm unter 700px Breite verifiziert. Keine Konsolenfehler während des
gesamten Durchlaufs.

**Speicherleck-Test (Schwerpunkt des Nutzers):** `d3.forceSimulation` wurde per
Monkeypatch instrumentiert, um jede erzeugte Simulation und jeden `.stop()`-
Aufruf zu zählen. Fünf vollständige Zyklen Zeitachse ↔ Personennetzwerk über die
echte `ansichtWechseln.js`-Dropdown-Interaktion (nicht über Seiten-Reloads):
5 Simulationen erzeugt, alle 5 gestoppt, 0 offen. Am Ende: exakt ein
`ansicht-wechseln`-Select, ein Unsicherheits-Button, ein `viz-inhalt`-Container
im DOM (keine Duplikate/Akkumulation über die Zyklen hinweg). Diese Prüfung
hängt nicht vom `document.hidden`-Verhalten des Hintergrund-Tabs ab (siehe
frühere Einträge) - `.stop()` wird synchron innerhalb von `destroy()`
aufgerufen, unabhängig davon, ob der interne `requestAnimationFrame`-Tick
tatsächlich feuert.

**Bewusst nicht Teil dieses Durchgangs** (Zeitgründe, mit dem Nutzer
abgestimmt): `resize()` der Module wird noch nirgends aufgerufen (kein
`window.resize`-Listener in `app.js`); der Kleiner-Bildschirm-Hinweis
aktualisiert sich nur beim nächsten Ansichtswechsel, nicht live bei
Fenster-Größenänderung; „Über"/„Literatur"/„Führungen" bleiben bewusst
Platzhalter, keine neuen Inhalte erfunden.

---

## 2026-08-11 – Teil B: Umstellung aller 31 Module auf echtes `options.showUncertainty`

**Betrifft:** alle 31 Visualisierungsmodule in `js/viz/` (siehe Liste unten), keine
gemeinsam genutzte Datei geändert (die Umstellung war bewusst pro Datei isoliert
gehalten, siehe Platzhalter-Eintrag weiter unten).

Der lokale Platzhalter `kennzeichneUnsicherheitImmer = true` wurde in allen 28
Modulen, die ihn nutzten, durch `const zeigeUnsicherheit = options.showUncertainty;`
(frisch bei jedem `render()`-Aufruf gelesen) ersetzt und an jeder Verwendungsstelle
eingesetzt. `regestenKachelraster.js` nutzte einen eigenen, älteren Mechanismus (siehe
weiter unten) und wurde separat auf denselben `options.showUncertainty`-Wert
umgestellt. `korrelationsmatrix.js` und `wortwolke.js` bleiben unverändert - beide
haben keine Unsicherheits-Dimension (Aggregatstatistik bzw. Wortfrequenz).

In sechs Paketen bearbeitet, nach jedem Paket gegen echte Daten getestet (ON/OFF-
Umschaltung, OFF muss stets 0 gestrichelte/markierte Elemente ergeben):

- **Paket 1** (Bestand): `treemap.js`, `sunburst.js`, `icicle.js`, `circlePacking.js`,
  `ganttDiagramm.js`. Getestet gegen `bestandsverzeichnis.csv`: 41/41 Elemente
  schalten korrekt um.
- **Paket 2**: `regestenKachelraster.js` (eigener Mechanismus, durchgängig durch
  `baueKarte`/`baueDatumFeld`/`baueListenFeld` verdrahtet), `zeitachse.js`,
  `kalenderHeatmap.js`, `dotPlot.js`, `swimlanes.js` (hier musste die Gate-Prüfung von
  der Aggregation an den Render-Zeitpunkt verschoben werden, da die Aggregation
  ehrlich immer zählen soll). Getestet gegen `urkunden.csv`: regestenKachelraster 187,
  zeitachse/dotPlot 47, kalenderHeatmap 0/0 (keine Überschneidung exakt+unsicher in
  den Daten), swimlanes 37 - alle OFF=0.
- **Paket 3**: `streamgraph.js`, `ridgeline.js`, `horizonChart.js`, `marimekko.js`,
  `alluvial.js`, `trellis.js` (Parameter-Durchreichung an `zeichneEinFacet`). Getestet:
  ridgeline 43, streamgraph/horizonChart 40, trellis 29, marimekko/alluvial 26 - alle
  OFF=0.
- **Paket 4**: `parallelKoordinaten.js`, `karte.js`, `verbindungskarte.js`,
  `bipartiteFlowMap.js`, `personennetzwerk.js` (Parameter-Durchreichung an
  `zeichneStatisch`/`starteAnimierteSimulation`, zwei Rendering-Pfade). Getestet:
  parallelKoordinaten 47, karte 86, verbindungskarte 90, bipartiteFlowMap 108,
  personennetzwerk 654 - alle OFF=0.
- **Paket 5**: `adjazenzmatrix.js`, `chordDiagramm.js`, `bipartiterGraph.js`,
  `arcDiagramm.js`, `personenliste.js`, `bubbleChart.js`. Getestet:
  bipartiterGraph 8, personenliste 4, bubbleChart 4 - alle OFF=0. Adjazenzmatrix,
  Chord-Diagramm und Arc-Diagramm zeigten ON=0 - direkt an den Daten nachgeprüft statt
  als Testfehler abgetan: von den 654 Ko-Nennungs-Paaren mit `personen_unsicher` hat
  keines *beide* Enden innerhalb der jeweiligen Top-40/25/20-nach-Grad-Teilmenge
  (`waehleTopPersonenNachGrad`) - ein echtes Merkmal der Datenverteilung (unsichere
  Personenzuordnung konzentriert sich auf seltener genannte, nicht auf die
  prominentesten Personen), kein Fehler in der Umstellung.
- **Paket 6**: `sankey.js` (Parameter-Durchreichung an `zeichneVerbindungsEbene`,
  zweimal aufgerufen), `familienbaum.js` (zwei Verwendungsstellen in
  `zeichneRahmenwerk`: Kanten für Eltern/Ehepartner-Unsicherheit, Knoten für Geburts-/
  Sterbedatum-Unsicherheit). Getestet gegen `urkunden.csv`/`familien.csv`: sankey 39,
  familienbaum-Knoten 19 - beide OFF=0. familienbaum-Kanten zeigte ON=0 - direkt
  nachgeprüft: `vater_id_unsicher`/`mutter_id_unsicher`/`ehepartner_id_unsicher` sind
  aktuell bei allen 80 Zeilen in `familien.csv` `nein` (nur
  `geburtsdatum_unsicher`/`sterbedatum_unsicher` sind belegt) - Datenstand, kein
  Code-Fehler, deckt sich mit dem bereits im Kommentarkopf von `familienbaum.js`
  dokumentierten Hinweis zu `unsicherheit_anmerkung`.

`karte.js` war zwischenzeitlich in einem kaputten Zwischenzustand (Konstante entfernt,
Verwendungsstelle noch nicht angepasst) liegengeblieben und vor dem Testen von Paket 4
korrigiert worden.

Der echte Unsicherheits-Button aus Teil A ist damit an alle 31 Module angebunden -
Teil C (App.js-Verdrahtung) ist der nächste Schritt.

---

## 2026-08-09 – Teil A: die drei gemeinsamen Bauteile (Kachelauswahl, Ansicht wechseln, Unsicherheits-Button)

**Betrifft:** `js/core/kachelauswahl.js`, `js/core/ansichtWechseln.js`,
`js/core/unsicherheitsButton.js`, neue Datei `js/config/archivalienRegistry.js`.

- **Neue Datei `archivalienRegistry.js`:** technisches Verzeichnis (Modul-IDs, Labels,
  Dateipfade für den dynamischen `import()`), kein archivarischer Inhalt im Sinne von
  Abschnitt 2. War nötig, damit kachelauswahl.js/ansichtWechseln.js/Teil C wissen,
  welche Archivalientypen und Ansichten es gibt, ohne das hart im jeweiligen Bauteil
  zu verdrahten. Enthält aktuell nur Urkunden (26 Ansichten) und die 5
  Bestand-Ansichten - Bürgerbuch/Ratsprotokolle/Verlassenschaftsinventare fehlen
  bewusst (Abschnitt 2: Content-driven, mit Einschränkung - kein Modul vorhanden).
- `ansichtWechseln.js` kennt weder `router.js` noch die echten 31 Module direkt -
  `ladeModulUndRender` wird vom Aufrufer übergeben (in Teil C: echter `import()` +
  `render()`; im isolierten Test: ein Dummy). So bleibt das Bauteil unabhängig
  testbar, wie gefordert.
- **Architektur-Klarstellung zu `unsicherheitsButton.js` (bitte bestätigen):** Das
  "Hintergrund abdunkeln, unsichere Elemente bleiben hell" aus Abschnitt 11 kann
  dieser Button nicht generisch von außen erzeugen - Abschnitt 11 selbst sagt, die
  Hervorhebung erfolgt "gezielt auf das jeweils betroffene Feld/Element", also
  innerhalb jeder einzelnen Visualisierung. Der Button toggelt Zustand + Beschriftung
  und löst das Neu-Rendern aus; das eigentliche Dimmen entsteht erst in Teil B, wenn
  alle 31 Module `options.showUncertainty` selbst auswerten.
- **Testmethodik-Grenze (dieselbe Ursache wie schon zweimal zuvor):** Ein direkter
  Nachweis über echte OS-Tastatureingabe (Tab + Enter über das `computer`-Tool)
  scheiterte, weil dieser Hintergrund-Tab `document.hidden=true` hat - Fokus wird
  nachweislich korrekt erreicht (Tab-Reihenfolge stimmt), aber die synthetische
  Eingabe wird nicht als vertrauenswürdiges Ereignis an einen nicht dargestellten Tab
  zugestellt. Ersatzweise verifiziert: echte `<button>`/`<select>`-Elemente (native
  Tastaturaktivierung per HTML-Spezifikation garantiert), korrekte Tab-Erreichbarkeit,
  und die Klick-Handler-Logik selbst (identischer Codepfad wie bei Enter/Leertaste)
  über echte `.click()`-Aufrufe bestätigt.

---

## 2026-08-09 – Etappe 5, Einzelfälle: Familienbaum, Wortwolke (Urkunden-Gruppe komplett)

**Betrifft:** `js/viz/familienbaum.js`, `js/viz/wortwolke.js`.

- `familienbaum.js` ist die erste Visualisierung, die eine andere Tabelle als
  urkunden.csv/personenliste.csv für die Unsicherheits-Kennzeichnung nutzt
  (geburtsdatum_unsicher, sterbedatum_unsicher, vater_id_unsicher,
  mutter_id_unsicher, ehepartner_id_unsicher aus familien.csv statt der
  Urkunden-Felder). Bewusst geprüft: `js/utils/uncertainty.js` (Etappe 4) braucht
  keine Anpassung, `filtereErklaerungFuerFeld()` nimmt den Feldnamen generisch als
  Parameter entgegen.
- **Datenstand-Fund (kein Code-Fehler):** `unsicherheit_anmerkung` ist in
  familien.csv aktuell für ALLE 80 Zeilen leer, obwohl 20 Zeilen ein `*_unsicher=ja`-
  Flag haben. Tooltip zeigt in diesem Fall den generischen Fallback-Text, wie schon
  bei `regestenKachelraster.js` - eine Lücke in den erfassten Daten, nicht im Code.
- Generationen-Layout über iterative Weiterreichung (Kind = Elterngeneration+1,
  Ehepartner teilen Generation), da die Daten kein einzelner sauberer
  Baum-Durchlauf sind, sondern ein Geflecht (viele "eingeheiratete" Personen haben
  in dieser Tabelle keine eigenen Eltern erfasst). Dieselben Force-Simulation-Regeln
  wie in Paket A angewendet und erneut einzeln verifiziert (`simulation.stop()`,
  `prefers-reduced-motion`).
- **Datenfund bei `wortwolke.js` (bitte bestätigen):** 796 von 1069 regest-Feldern
  enthalten einen angehängten Quellenverweis, in ZWEI unterschiedlichen
  Formulierungen ("Source Regest: ..." bei älteren, "Quelle Regest: ..." bei
  neueren/2020er Einträgen). Der erste Testlauf deckte nur die erste Formulierung
  ab - "regest" tauchte dadurch selbst unter den häufigsten Wörtern auf. Per
  gezielter Datenprüfung gefunden und auf beide Formulierungen erweitert.
- Kein d3-cloud (nicht im freigegebenen Stack) - Spiral-Platzierung mit
  Kollisions-Bounding-Boxen von Hand gebaut, `canvas.measureText()` für
  Textbreiten-Schätzung. Deutsche Stoppwortliste ist eine erste Fassung
  (wie `datePrecision.js` ursprünglich), historisches Deutsch ggf. nicht vollständig
  abgedeckt.

**Konsistenz-Nachprüfung über alle 31 Visualisierungsdateien:** vor Abschluss der
Urkunden-Gruppe per Grep geprüft, welche Dateien `kennzeichneUnsicherheitImmer`
tatsächlich verwenden. Dabei zwei weitere Instanzen derselben Lücke wie schon bei
`personenliste.js`/`bubbleChart.js` (siehe Paket-B-Eintrag) gefunden und behoben:
`familienbaum.js` (beim ersten Schreiben übersehen) und `kalenderHeatmap.js`
(übersehen seit Paket 1, also von Anfang an unbemerkt). Beide per Regressionstest
mit identischem Ergebnis wie vorher bestätigt. **Bewusst NICHT nachgerüstet:**
`regestenKachelraster.js` (Etappe 4, entstanden BEVOR dieses Platzhalter-Muster
etabliert wurde - eigener, älterer Mechanismus ohne `options.showUncertainty`-Bezug;
nicht ohne Rückfrage angefasst, da bereits gesondert bestätigtes Modul und nicht Teil
des aktuellen Auftrags). `korrelationsmatrix.js`/`wortwolke.js` brauchen das Muster
nicht (Aggregat-Statistik bzw. keine Unsicherheits-Dimension, siehe jeweiliger
Dateikopf).

## 2026-08-09 – Etappe 5 Paket C: Sankey, Korrelationsmatrix

**Betrifft:** `js/viz/sankey.js`, `js/viz/korrelationsmatrix.js`.

- `sankey.js` zeigt bewusst DREI Stufen (Jahrhundert -> Kategorie -> Datierungs-
  präzision) statt zwei, um sich inhaltlich von `alluvial.js`/`bipartiteFlowMap.js`
  abzugrenzen, nicht nur technisch zu wiederholen. Kein d3-sankey (nicht im
  freigegebenen Stack), Bezier-Ribbons wieder von Hand.
- **Zwei echte Bugs beim eigenen Code-Review vor dem ersten Testlauf gefunden und
  behoben** (nicht erst durch Tests aufgefallen): (1) tote Code-Berechnung
  (`geometrie`-Variable wurde erzeugt, aber nie verwendet); (2) der Stapel-Cursor pro
  Knoten wurde nie fortgeschrieben, wodurch mehrere Bänder desselben Knotens
  übereinandergelegen hätten statt sich zu stapeln. Nach der Korrektur per direkter
  Datenprüfung bestätigt: keine Überlappungen in 24 Von-Knoten-Gruppen, beide
  Fluss-Ebenen summieren exakt auf 1069 (Fluss-Erhaltung korrekt).
- Zusätzlich gefunden: `PRAEZISIONS_LABEL` war definiert, aber nirgends tatsächlich
  verwendet - die rechte Spalte hätte rohe Codes ("exact" statt "genaues Datum")
  gezeigt. Korrigiert.
- **`korrelationsmatrix.js` – Farb-Ausnahme, bitte bestätigen:** eine
  Korrelationsmatrix muss das Vorzeichen zeigen (positiv/negativ), eine einzelne
  Kategorie-Farbe mit Deckkraft kann das nicht. Verwendet werden zwei bereits im
  Projekt etablierte technische Farben (Kartenblau `#1a4d8f` für positiv,
  Unsicherheits-Rot `#c0392b` für negativ) statt einer neuen Skala - trotzdem eine
  Abweichung von "ausschließlich CAT_COLORS" (Abschnitt 13).
- Fünf Kennzahlen: Jahr, Anzahl Orte, Anzahl Personen, Anzahl Kategorien,
  Regest-Länge (Wörter). Fehlende Werte (z.B. Jahr bei undatierten Urkunden) werden
  paarweise ausgeschlossen (übliche Konvention), kein `kennzeichneUnsicherheitImmer`-
  Platzhalter nötig, da diese Zellen Aggregat-Statistiken über den ganzen Bestand
  zeigen, keine einzelnen Urkunden mit eigenem Unsicherheits-Flag.
- Test-Stichprobe zur Plausibilität: Jahr↔Regest-Länge r=-0.32, Anzahl Personen↔
  Regest-Länge r=+0.37 - beides historisch nachvollziehbar (ältere Urkunden knapper
  erfasst, mehr genannte Personen typischerweise ausführlicher beschrieben).

## 2026-08-09 – Etappe 5 Paket B: Personenliste, Bubble Chart

**Betrifft:** `js/viz/personenliste.js`, `js/viz/bubbleChart.js`.

- Beide arbeiten direkt mit `personenliste.csv` (nicht `urkunden.csv` wie Paket A) -
  zeigen bewusst ALLE 4116 Personen (Urkunden UND Bürgerbuch), da diese Tabelle laut
  SCHEMA.md das vollständige zusammengeführte Personenregister ist, nicht nur der
  Urkunden-Ausschnitt aus Paket A.
- `personenliste.js`: sortierbare/durchsuchbare Tabelle, `unsicherheit_anmerkung`
  bezieht sich hier auf die ganze Zeile (keine `<feldname>_unsicher`-Begleitfelder in
  dieser Tabelle, siehe SCHEMA.md) - anders als bei urkunden.csv-basierten Modulen.
- **Offener Punkt zu den Top-N-Schwellenwerten aus Paket A** (auf Nachfrage): Nur
  `chordDiagramm.js` und `adjazenzmatrix.js` haben eine tatsächlich hergeleitete
  Zahl (Zellenanzahl-Explosion bzw. "~20-30 Knoten, sonst unlesbar"). `arcDiagramm.js`
  (40) und `bipartiterGraph.js` (25) waren pragmatische Rundwerte ohne denselben Grad
  an Herleitung - für die methodische Begründung in der Arbeit ggf. später nachschärfen.

## 2026-08-09 – Etappe 5 Paket A: Personennetzwerk, Adjazenzmatrix, Chord-Diagramm, Bipartiter Graph, Arc-Diagramm

**Betrifft:** `js/viz/personennetzwerk.js`, `js/viz/adjazenzmatrix.js`, `js/viz/chordDiagramm.js`,
`js/viz/bipartiterGraph.js`, `js/viz/arcDiagramm.js`, neue Datei `js/utils/urkundenPersonen.js`.
Erste Visualisierung mit echter D3-Force-Simulation in diesem Projekt.

- **Skalen-Hinweis:** 1351 Personen haben mindestens eine Ko-Nennung, 4083 eindeutige
  Paare. `personennetzwerk.js` zeigt das vollständige Netzwerk (Kraft-Layouts skalieren
  darauf noch angemessen); Adjazenzmatrix/Chord/Bipartiter Graph/Arc-Diagramm zeigen
  stattdessen eine nach Verbindungsgrad sortierte Teilmenge (Top 40/20/25/40), da diese
  Diagrammtypen strukturell nicht auf tausende Knoten skalieren - jeweils mit sichtbarer
  "Top N von 1351"-Beschriftung (Abschnitt 12: keine stille Einschränkung).
- Personen ganz ohne Ko-Nennung (107) erscheinen in `personennetzwerk.js` in einer
  eigenen Liste unterhalb des Graphen, nicht als nutzlose isolierte Punkte im Kraft-Layout.
- **Zwei echte Bugs beim Testen gefunden und behoben** (nicht nur Testartefakte):
  1. `d3.forceLink()` erwartet `.source`/`.target` auf den Link-Objekten, nicht die
     ursprünglich verwendeten `.a`/`.b` - führte zu "node not found: undefined".
  2. In `arcDiagramm.js`/`bipartiterGraph.js` wurden `<g>`-Gruppen per
     `.selectAll('g.person-knoten')...join('g')` erzeugt, aber die Klasse nie tatsächlich
     per `.attr('class', ...)` gesetzt (anders als in allen übrigen Modulen) - Elemente
     existierten, waren aber über den Klassen-Selektor nicht auffindbar.
- **Force-Simulation-Regeln (Abschnitt 13/10) umgesetzt und einzeln verifiziert:**
  schrittweise Berechnung über den intern rAF-basierten `d3.timer()` (kein manuelles
  Massen-Ticken), `simulation.alpha(0.3)`, `simulation.stop()` in `destroy()` (per Spion
  bestätigt), `prefers-reduced-motion` (per `matchMedia`-Override bestätigt: bei aktivierter
  Einstellung wird einmalig synchron vorberechnet statt animiert, Positionen ändern sich
  danach nachweislich nicht mehr).
- **Testmethodik-Fund:** In diesem (Hintergrund-)Tab ist `document.hidden = true`, wodurch
  der interne rAF-Timer der Simulation pausiert bleibt (gleiche Ursache wie beim
  `IntersectionObserver`-Fund in Etappe 4) - UND `simulation.tick()` selbst löst den
  registrierten `'tick'`-Callback nicht aus (das übernimmt sonst der Timer zusätzlich zum
  Positions-Update). Beides einzeln nachgewiesen und die eigentliche Tick-Handler-Logik
  durch manuelles Aufrufen des eingefangenen Callbacks unabhängig davon bestätigt.

## 2026-08-09 – Etappe 5, ortsbasierte Gruppe: Karte, Verbindungskarte, Bipartite Flow Map

**Betrifft:** `js/viz/karte.js`, `js/viz/verbindungskarte.js`, `js/viz/bipartiteFlowMap.js`,
neue Dateien `js/utils/urkundenOrte.js` und `js/utils/statischeKarte.js`. Erste Nutzung
von Leaflet 1.9 in diesem Projekt (bisher nur D3).

- Orts-Referenzierung bleibt namensbasiert (Masterprompt Abschnitt 8), `orte.csv`
  über `dataLoader.js`/`ladeCSV()` geladen wie jede andere Tabelle, lat/lon mit
  Komma-Dezimaltrennzeichen (wie `umfang_lfm` in `bestandsverzeichnis.csv`).
- **Entdeckter, verifizierter Datenpunkt:** 10 Urkunden verweisen auf Ortsnamen, die
  in `orte.csv` zwar als Zeile existieren, aber ohne `lat`/`lon` (die Archivarin hat
  das bereits selbst über `orte_unsicher=ja` und eine erklärende
  `unsicherheit_anmerkung` markiert, z.B. "Koordinaten nicht verifiziert"). `karte.js`
  behandelt das korrekt als nicht verortbar (keine Koordinate = kein Marker), nicht
  als Bug - anfangs ein scheinbarer Testfehlschlag (30 statt 40 erwartet), durch
  gezielte Prüfung aufgeklärt statt stillschweigend "repariert".
- `karte.js` bleibt voll interaktiv (Pan/Zoom) und zeigt "nicht verortbare Urkunden"
  in einem eigenen Bereich unterhalb der Karte (ein Off-Map-Bereich ist bei einer
  Karte anders als bei Marimekko/Alluvial ohne Weiteres möglich).
- `verbindungskarte.js`/`bipartiteFlowMap.js` sind dagegen STATISCH (kein Pan/Zoom) -
  siehe Kommentarkopf `js/utils/statischeKarte.js`: sie brauchen zusätzlich zu echten
  Koordinaten feste, nicht-geografische Bezugspunkte (Kategorie-Spalte bzw. der
  virtuelle Knoten "Nicht verortet"), deren Bildschirm-Position bei einer live
  mitschwenkenden Karte kontinuierlich neu berechnet werden müsste. Für diese Etappe
  bewusst vereinfacht auf eine einmalige Positionsberechnung; ein Wechsel zu einer
  live mitschwenkenden Karte wäre eine spätere, bewusste Erweiterung.
- Beide netzartigen Module geben Urkunden ohne auflösbaren Ort einen eigenen Knoten
  "Nicht verortet" (Masterprompt Abschnitt 8a/v4.3), keinen separaten Bereich.
- `alluvial.js`s Bezier-Ribbon-Technik direkt wiederverwendet in `bipartiteFlowMap.js`
  (nicht als gemeinsame Funktion ausgelagert, da die beiden Verwendungen sich in der
  Knoten-Geometrie unterscheiden - bewusst nicht überabstrahiert).

## 2026-08-09 – Etappe 5 Paket 3: Marimekko, Alluvial-Diagramm, Trellis, Parallelkoordinaten

**Betrifft:** `js/viz/marimekko.js`, `js/viz/alluvial.js`, `js/viz/trellis.js`,
`js/viz/parallelKoordinaten.js`, außerdem Erweiterung von `js/utils/urkundenZeit.js`
um `gruppiereNachJahrhundertUndKategorie()` (nur Ergänzung, bestehende Exporte
unverändert – Regressionstest der Paket-1/2-Module nach dieser Änderung bestanden).

- Marimekko und Alluvial-Diagramm behandeln undatierte Urkunden als regulären eigenen
  Bucket/Knoten ("Undatiert"), nicht als separaten Bereich wie die übrigen Module –
  technisch genauso wie jedes andere Jahrhundert behandelbar, daher kein Sonderfall
  im Rendering nötig (Details im Kommentarkopf von `urkundenZeit.js`).
- `alluvial.js` zeichnet die Fluss-Bänder von Hand (Bezier-Ribbons), ohne d3-sankey
  einzuführen – d3-sankey ist nicht Teil des freigegebenen Stacks (Abschnitt 2).
- `parallelKoordinaten.js`: kein Brushing/Filtern in dieser Etappe, nur Hover/Fokus
  mit Tooltip – bewusst nicht gebaut, um den Umfang nicht unangekündigt zu erweitern.
  Urkunden ohne Jahr erscheinen im "Ohne Jahr, hier nicht darstellbar"-Bereich, da sie
  auf der Jahr-Achse nicht sinnvoll positionierbar sind.

## 2026-08-09 – Etappe 5 Paket 2: Streamgraph, Ridgeline, Horizon Chart

**Betrifft:** `js/viz/streamgraph.js`, `js/viz/ridgeline.js`, `js/viz/horizonChart.js`,
außerdem Erweiterung von `js/utils/urkundenZeit.js` um `ermittleKategorienSortiertNachHaeufigkeit()`
(dorthin verschoben aus `dotPlot.js`/`swimlanes.js`, dort jetzt entfernt – reiner DRY-Refactor,
kein Verhaltensunterschied, per Regressionstest bestätigt), `berechneJahresBins()` und
`gruppiereProBinUndKategorie()`.

- Alle drei zusätzlich zu Paket 1 auf `js/utils/urkundenZeit.js` angewiesen – Änderungen dort
  betreffen jetzt sieben Module (Paket 1 + Paket 2).
- Da eine Fläche/Kurve/Zelle viele Urkunden bündelt, wird Unsicherheit hier über einen
  Marker (Punkt bzw. Dreieck) statt eines gestrichelten Rands gezeigt, wenn mindestens
  eine Urkunde im jeweiligen Zeitfenster/Kategorie-Segment `datum_unsicher=true` hat.
- `horizonChart.js` kodiert die "gefalteten" Bänder über steigende Deckkraft derselben
  Kategorie-Farbe (keine zusätzliche Farbskala, Abschnitt 13).

## 2026-08-09 – Etappe 5 Paket 1: vier neue zeit-/kategoriebasierte Urkunden-Visualisierungen

**Betrifft:** `js/viz/zeitachse.js`, `js/viz/kalenderHeatmap.js`, `js/viz/dotPlot.js`,
`js/viz/swimlanes.js` sowie die neue gemeinsame Datei `js/utils/urkundenZeit.js`.

- Gemeinsame Zeit-/Kategorie-Aufbereitung (Jahr parsen, undatierte Einträge abtrennen,
  Tooltip-Text, die wiederverwendbare "nicht darstellbar"-Sammelfläche) liegt in
  `js/utils/urkundenZeit.js` – Änderungen dort betreffen alle vier Module.
- Alle vier zeigen `daten_unsicher` weiterhin als fest sichtbaren Platzhalter (siehe
  Eintrag unten), hier über `datum_unsicher` (das für zeitbasierte Ansichten naheliegende
  Feld), nicht `orte_unsicher`/`personen_unsicher`.
- `kalenderHeatmap.js` aggregiert Tagesgenauigkeit-Urkunden über alle ~700 Jahre hinweg
  auf einem Monat×Tag-Raster (keine im Masterprompt/SCHEMA.md festgelegte Vorgabe,
  eigene Auslegung – siehe Kommentarkopf der Datei). Bitte bei Gelegenheit bestätigen.

## 2026-08-09 – Platzhalter: `daten_unsicher` fest sichtbar statt über `options.showUncertainty`

**Betrifft:** `js/viz/treemap.js`, `js/viz/sunburst.js`, `js/viz/icicle.js`,
`js/viz/circlePacking.js`, `js/viz/ganttDiagramm.js`, `js/viz/zeitachse.js`,
`js/viz/kalenderHeatmap.js`, `js/viz/dotPlot.js`, `js/viz/swimlanes.js`,
`js/viz/streamgraph.js`, `js/viz/ridgeline.js`, `js/viz/horizonChart.js`,
`js/viz/marimekko.js`, `js/viz/alluvial.js`, `js/viz/trellis.js`,
`js/viz/parallelKoordinaten.js`, `js/viz/karte.js`, `js/viz/verbindungskarte.js`,
`js/viz/bipartiteFlowMap.js`, `js/viz/personennetzwerk.js`, `js/viz/adjazenzmatrix.js`,
`js/viz/chordDiagramm.js`, `js/viz/bipartiterGraph.js`, `js/viz/arcDiagramm.js`,
`js/viz/personenliste.js`, `js/viz/bubbleChart.js`, `js/viz/sankey.js`,
`js/viz/familienbaum.js` (alle achtundzwanzig Visualisierungen, die dieses Muster
verwenden - siehe Konsistenz-Nachprüfung im Eintrag oben für zwei Ausnahmen und
zwei nachträglich behobene Lücken).

Der echte Unsicherheits-Button (Abschnitt 11) existiert noch nicht. Bis dahin zeigen alle
achtundzwanzig Module ihre jeweilige Unsicherheits-Kennzeichnung (gestrichelter roter Rand,
Marker oder hervorgehobene Linie je nach Darstellungsform, bei der Treemap zusätzlich
ein Warnsymbol) über eine lokale Konstante `kennzeichneUnsicherheitImmer = true` fest
an – unabhängig vom tatsächlichen Wert von `options.showUncertainty`.

**TODO, sobald der Unsicherheits-Button gebaut ist:** In allen achtundzwanzig Dateien
`kennzeichneUnsicherheitImmer` durch die reale Auswertung von `options.showUncertainty`
ersetzen (je eine Stelle pro Datei, die Konstante ist lokal, keine geteilte Datei betroffen).
Absichtlich pro Datei als Konstante gehalten, damit diese Umstellung nicht in einer
gemeinsam genutzten Datei versteckt übersehen werden kann, sondern in jeder Datei
einzeln sichtbar ist. `js/viz/regestenKachelraster.js` nutzt einen eigenen, älteren
Mechanismus ohne dieses Muster (siehe Eintrag oben) - bei der Umstellung gesondert
berücksichtigen.
