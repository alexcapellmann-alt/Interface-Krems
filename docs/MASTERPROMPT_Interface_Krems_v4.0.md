# Masterprompt: Interface Stadtarchiv Krems – Neuarchitektur (v4.0, eingefroren)

**Rolle, Ziel, Kontext:** Du bist Entwickler*in für ein archivwissenschaftliches Interface-Projekt. Dein Ziel ist maximal sauberer, modularer Code nach den in diesem Dokument festgelegten Regeln – nicht die schnellste, sondern die wartbarste Lösung. Der Kontext: ein digitales Interface für ein niederösterreichisches Gemeindearchiv (Fallbeispiel Stadtarchiv Krems), entstanden im Rahmen einer Masterarbeit in Historischen Hilfswissenschaften und Archivwissenschaft. Alle Entscheidungen in diesem Dokument sind bereits mit der Auftraggeberin abgestimmt – bei Unklarheiten nachfragen, nicht eigenständig neue Architekturentscheidungen treffen.

Dieses Dokument ist die verbindliche Grundlage für die Programmierarbeit an diesem Projekt. Es entsteht im Rahmen einer Masterarbeit (Historische Hilfswissenschaften und Archivwissenschaft, Universität Wien) zur Visualisierung und zum Interface-Design für niederösterreichische Gemeindearchive, mit dem Stadtarchiv Krems als Fallbeispiel.

**Status:** Diese Version gilt als stabile Arbeitsgrundlage. Weitere Änderungen erfolgen nur noch, wenn sich während der Implementierung zeigt, dass eine Regel in der Praxis nicht funktioniert oder unklar ist, oder wenn sich aus der Masterarbeit eine neue fachliche Anforderung ergibt. Die tatsächliche Weiterentwicklung wird ab jetzt über `docs/PROJEKTLOG.md` dokumentiert, nicht mehr über neue Masterprompt-Versionen.

**Änderungen gegenüber v3.11 (Korrektur nach Etappe-1-Implementierung):** Abschnitt 6 präzisiert auf `d3.dsvFormat(';').parse()` statt `d3.csvParse()` – letzteres parst standardmäßig Komma-getrennt, was dem Semikolon-Trenner aus Abschnitt 12 widerspricht. Funktional identisch (gleicher robuster D3-Parser), nur korrekt benannt.

---

## 1. Projektidentität

Ein interaktives, browserbasiertes Interface zur Exploration der Bestände des Stadtarchivs Krems. Zielgruppe der Endnutzung: Bürger*innen, Heimatforscher*innen, Studierende – überwiegend ohne Vorwissen im Umgang mit Archiven oder Datenvisualisierung. Zielgruppe der Datenpflege: eine Archivarin bzw. ein Archivar ohne Programmierkenntnisse.

**Ablösung der bisherigen Architektur:** Das Projekt wird von Grund auf neu aufgebaut. Die bisherige Umsetzung als einzelne, sehr große `index.html`-Datei wird durch eine sauber getrennte Mehrdateien-Architektur ersetzt. Bereits vorhandene fachliche/inhaltliche Bestandteile (z. B. Urkunden-Visualisierungen, Datenstrukturen) werden wo sinnvoll übernommen, aber technisch neu und sauber aufgebaut.

---

## 2. Grundprinzip der Architektur

- **Kein Build-Step.** Der Code wird so geschrieben, wie er im Browser läuft – kein Zwischenschritt, keine zusätzliche Software zum "Übersetzen" des Codes, keine Installation nötig.
- **Keine Frameworks, keine npm-Pakete im Endprodukt.** Technischer Stack bleibt: D3.js v7, Leaflet 1.9, natives modernes JavaScript (ES Modules).
- **Content-driven, mit Einschränkung:** Archivarische Inhalte (Bestandseinträge, Literatur, Führungen) ergeben sich automatisch aus den Datentabellen im `data/`-Ordner. Das gilt nicht automatisch für Visualisierungen: Eine neue CSV-Datei erzeugt eine neue Kachel im Visualisierungen-Tab nur, wenn bereits ein passendes Visualisierungsmodul für diesen Archivalientyp existiert. Ohne passendes Modul erscheint kein Fehler, sondern ein Hinweis "noch nicht visualisierbar".
- **Fetch, nie einbetten.** Keine archivarischen Inhalte als feste Werte im JavaScript-Code. Rein technische Konstanten (Farbpalette, Layout-Werte) dürfen im Code stehen, siehe Abschnitt 3.
- **Lazy Loading.** Eine Visualisierung wird erst geladen (Code und Daten), wenn sie erstmals tatsächlich aufgerufen wird – nicht beim Start der gesamten Anwendung. Das begrenzt die Ladezeit trotz über 30 möglicher Visualisierungen.
- **Mobile-First als Entwicklungsprinzip, nicht als Theorie.** Das Interface wird von Anfang an so gebaut, dass es auf Smartphones und Tablets funktioniert. Die inhaltliche Begründung für zugängliches Design liefert nicht "Mobile First" selbst, sondern WCAG/Inclusive Design (siehe Abschnitt 10).

---

## 3. Ordnerstruktur

```
interface-krems/
├── index.html
├── css/
│   ├── base.css
│   ├── layout.css
│   └── components.css
├── js/
│   ├── core/
│   │   ├── app.js
│   │   ├── dataLoader.js         # Vertrag: siehe Abschnitt 6
│   │   ├── state.js              # Schema: siehe Abschnitt 7
│   │   └── router.js             # Schema: siehe Abschnitt 8
│   ├── viz/
│   │   ├── treemap.js
│   │   ├── sunburst.js
│   │   ├── icicle.js
│   │   ├── ganttDiagramm.js
│   │   ├── circlePacking.js
│   │   ├── regestenKachelraster.js
│   │   ├── zeitachse.js
│   │   ├── karte.js
│   │   ├── personennetzwerk.js
│   │   └── ... (eine Datei pro Visualisierung, gemeinsames Modul-Interface, siehe Abschnitt 5)
│   ├── utils/
│   │   ├── csvParser.js           # nutzt d3.dsvFormat(';').parse() (RFC-4180-konform, Semikolon-Trenner), kein Eigenbau-Parser
│   │   ├── colors.js              # CAT_COLORS, technische Konstante
│   │   ├── tooltip.js
│   │   ├── uncertainty.js
│   │   └── datePrecision.js
│   └── config/
│       └── constants.js
├── data/
│   ├── urkunden.csv
│   ├── ratsprotokolle.csv
│   ├── bestand.csv
│   ├── buergerbuch.csv
│   ├── verlassenschaftsinventare.csv
│   ├── familien.csv
│   ├── orte.csv
│   ├── personenliste.csv
│   ├── literatur.csv
│   ├── fuehrungen.csv
│   └── ...
├── fotos/
│   └── thumbs/
│       └── <foto_ordner>/           # Ordnername entspricht NICHT zuverlässig der Signatur, siehe Bilder-Konvention
│           ├── StAK_..._r.jpg
│           └── StAK_..._v.jpg       # beliebig viele, beliebiges Namensschema
└── docs/
    ├── SCHEMA.md
    └── PROJEKTLOG.md
```

**Bilder-Konvention:** Thumbnails zu Urkunden liegen im Projektordner unter `fotos/thumbs/<foto_ordner>/`, ein Unterordner pro Urkunde. Die Ordnernamen entsprechen **nicht zuverlässig** der Signatur (uneinheitliche Schreibweisen wie `StaAKr-0001` vs. `StAK-UrkKr-0233` vs. `StAK-UrkKR-0644`, teils datumsbasierte Namen wie `StAK_1647_909_reg`) – deshalb verweist `urkunden.csv` über ein eigenes Feld `foto_ordner` (siehe `docs/SCHEMA.md`) explizit auf den tatsächlichen Ordnernamen, statt dass der Code versucht, Signatur und Ordnername automatisch abzugleichen. Innerhalb eines Ordners werden beim Laden einfach alle vorhandenen Bilddateien aufgelistet, unabhängig von ihrem Namensschema (aktuell überwiegend `_r`/`_v` für Vorder-/Rückseite, teils zusätzlich durchnummeriert) – der Code erwartet kein festes Namensmuster und keine feste Anzahl.

**Originale bleiben außerhalb des Projekts:** Die Original-Fotos (`fotos/<foto_ordner>/`, ohne `thumbs/`) sind bewusst nicht Teil des Projektordners – sie sind meist zu groß für die Veröffentlichung und werden separat/lokal aufbewahrt. Nur `fotos/thumbs/` gehört zum Interface-Projekt und wird ausgeliefert.

**Bestätigt vorhanden, nicht nur hypothetisch:** In der echten Ordnerliste sind bereits 17 von 1069 Ordnern leer (keine Fotos vorhanden) – die Fallback-Regel ("Foto folgt") ist also von Anfang an aktiv, nicht erst für zukünftige Fälle relevant.

Fehlt zu einer Signatur ein Ordner oder sind keine Bilddateien vorhanden (z. B. bei neu erfassten, noch nicht fotografierten Urkunden), zeigt das Interface einen sichtbaren Hinweis ("Foto folgt") anstelle eines Bildes – kein stiller Ausfall, kein kaputtes Bild-Symbol, konsistent mit der Fehlerbehandlungs-Regel aus Abschnitt 12.

**Klarstellung zu Konfigurationsdateien:** Es gibt bewusst keine zentrale `config.json` für archivarische Inhalte – diese laufen ausschließlich über CSV-Dateien in `data/`. `constants.js`/`colors.js` sind rein technische, entwicklerseitige Werte, die im Code liegen dürfen.

---

## 4. Seitenstruktur (Landing Page)

Fünf Tabs in der Hauptnavigation (bewusst begrenzt, siehe Abschnitt 9 zu Hicks Gesetz): **Bestand, Visualisierungen, Führungen, Literatur, Über**.

### 4.1 Bestand
Startet mit der Treemap der Gesamtbestände (Becker-Dokumentationsprofil). Button „Ansicht wechseln" zu Sunburst, Icicle, Gantt-Diagramm, Circle Packing – Darstellungen derselben Daten.

### 4.2 Visualisierungen
Kachelübersicht der Archivalientypen. Klick führt direkt zur quellennahen Primäransicht (bei Urkunden: Regesten-Kachelraster), nicht zu einer Auswahlseite. „Ansicht wechseln" führt zu weiteren Darstellungen.

**Kontext-erhaltender Wechsel:** Klick auf einen Namen oder Ort in der Primäransicht führt zur passenden Detailansicht mit vorausgewähltem Kontext (technisch über den Filter-Zustand, siehe Abschnitt 7).

**Komplexe Visualisierungen auf kleinen Bildschirmen:** Personennetzwerk und Gantt-Diagramm werden auch auf kleinen Bildschirmen geladen, jedoch mit einem deutlich sichtbaren Hinweis versehen ("Diese Ansicht ist für größere Bildschirme optimiert"). Keine separate vereinfachte Ersatzdarstellung.

Für Archivalientypen ohne bestehende Visualisierungen (Bürgerbuch, Protokolle, Verlassenschaftsinventare) gilt dasselbe Grundprinzip, sobald Daten und Module vorliegen.

### 4.3 Führungen
Übersicht der thematischen Pfade, über Tabelle gesteuert.

### 4.4 Literatur
Tabelle mit Titel, Autor*in, Jahr, Kurzbeschreibung, Kategorie, Link.

### 4.5 Über
Projektbeschreibung, Datengrundlage, Unsicherheitslegende.

---

## 5. Gemeinsames Modul-Interface für Visualisierungen

Jede Visualisierungsdatei in `js/viz/` exportiert exakt drei Funktionen, benannt nach etabliertem Sprachgebrauch der Visualisierungs-Community:

- **render(container, data, options)** – zeichnet die Visualisierung
- **destroy()** – jede Visualisierung gibt darin sämtliche von ihr selbst erzeugten Ressourcen zuverlässig frei (z. B. laufende Force-Simulationen stoppen, `d3.timer`-Instanzen abbrechen, selbst registrierte Event-Listener wie `window.addEventListener('resize', ...)` explizit wieder entfernen). Welche Ressourcen das konkret sind, hängt vom jeweiligen Visualisierungstyp ab – eine Treemap hat z. B. keine Simulation zu stoppen, ein Personennetzwerk schon. Die Pflicht gilt unabhängig davon, ob eine bestimmte Visualisierung überhaupt laufende Prozesse hat.
- **resize()** – passt die Darstellung an eine veränderte Bildschirmgröße an

**Inhalt von `options` (einheitlich für alle Visualisierungen):**
```
{
  showUncertainty: true/false,   // Status des Unsicherheits-Modus
  width: ...,
  height: ...,
  theme: {...}                    // Farbpalette/Layout-Konstanten aus config/
}
```

Kein Visualisierungsmodul verändert Zustand außerhalb seiner eigenen Datei. **Kein Visualisierungsmodul verändert die übergebenen Rohdaten (`data`)** – benötigt eine Visualisierung eine andere Form der Daten, erstellt sie intern eine eigene Kopie, statt das übergebene Original zu verändern. Das verhindert schwer auffindbare Fehler, wenn dieselben Daten später an eine andere Visualisierung weitergereicht werden.

Wiederverwendbare Bauteile (Kachelauswahl, „Ansicht wechseln"-Button, Unsicherheits-Button) folgen demselben Muster: eine Funktion, die einen Baustein erzeugt und die zugehörigen Handgriffe zurückgibt.

**Klassen:** kein pauschales Verbot. Standard ist die funktionsbasierte Bauweise; eine Klasse darf verwendet werden, wenn sie die Komplexität an dieser konkreten Stelle nachweislich reduziert – dann aber mit kurzer Begründung im Code-Kommentar.

---

## 5a. Partizipations-Modul

**Status:** Bewusste Kehrtwende gegenüber einer früheren Entscheidung (v3.0–v3.6 schlossen Citizen-Science-Funktionen aus). Diese Änderung wurde ausdrücklich bestätigt.

**Zweck:** Nutzer*innen können zu einzelnen Datensätzen (z. B. einer Urkunde) einen Änderungsvorschlag einreichen. Der Vorschlag wird **niemals direkt in die kuratierten CSV-Dateien geschrieben**, sondern extern gesammelt und ausschließlich manuell vom Archivar/der Archivarin geprüft, bevor er in die eigentlichen Datenquellen übernommen wird.

**Vertrag:** Wie jedes andere Modul (Abschnitt 5): `render(container, kontext, options)` / `destroy()` / `resize()`. Zusätzlich strikt getrennt: eine eigene, kleine Funktion `sendeVorschlag(daten)`, die ausschließlich für die Übertragung zuständig ist – Formular-Anzeige und Versand sind bewusst zwei getrennte Verantwortlichkeiten (Tell-Don't-Ask, Single Responsibility), damit ein späterer Wechsel des Backends nur diese eine Funktion betrifft, nicht das ganze Modul.

**Technische Umsetzung (Prototyp-Stufe):** Formular sendet per `fetch()` (POST) an einen extern konfigurierten Formular-Dienst (aktuell: Forminit, Public-Modus, EU-Serverstandort laut Anbieterangabe – Details zu Firmensitz/Subprozessoren bei Bedarf gesondert prüfen, kein abschließend gesichertes rechtliches Urteil). Kein eigener Server, kein Login-System.

**Konfiguration, nie hartkodiert:**
- `PARTICIPATION_ENDPOINT` in `js/config/constants.js` – die Ziel-URL, manuell bei Forminit erzeugt (Kontoerstellung kann nicht automatisiert werden, das muss die Archivarin/der Betreiber einmalig selbst tun)
- `PARTICIPATION_ENABLED` (true/false) in `js/config/constants.js` – zentraler Schalter, mit dem eine übernehmende Institution die gesamte Funktion ausschalten kann, ohne Code zu ändern

**Formularfelder:**

*Versteckt, automatisch aus `state.js` befüllt (Nutzer*in tippt sie nicht selbst ein):*
- `bezug_typ` (z. B. "urkunde")
- `bezug_id` (Signatur/ID des betroffenen Datensatzes)
- `feld_name` (betroffenes Feld, z. B. "orte")
- `inhalt_alt` (aktueller Wert des Feldes, zur Orientierung)

*Sichtbar, vom Nutzer/von der Nutzerin ausgefüllt:*
- `name` (Pflicht, Zurechenbarkeit)
- `email` (Pflicht, Zurechenbarkeit/Rückfrage)
- `typ` (Auswahl: Neuvorschlag / Ergänzung / Korrektur)
- `inhalt_vorschlag` (Pflicht, Freitext)
- `begruendung` (optional, Freitext)
- `quelle` (optional, Beleg/Link, getrennt von `begruendung`)

Kein Kontosystem, keine Authentifizierung – Zurechenbarkeit ausschließlich über Selbstauskunft. Qualitätssicherung ausschließlich durch manuelle Prüfung, nicht durch technische Identitätsprüfung.

**UI-Platzierung:** Button in der Sidebar-Detailansicht eines Datensatzes. Zusätzlich: Eine Übersicht aller unsicher gekennzeichneten Elemente ist über den ohnehin auf jeder Visualisierungsseite vorhandenen Unsicherheits-Button erreichbar (Abschnitt 11) – kein separates, seiten-spezifisches Sonderbauteil nur für Orte, sondern ein generisches, wiederverwendbares Muster, das später z. B. auch für unidentifizierte Personen im Netzwerk gilt.

**Zwei Ausbaustufen (siehe auch Abschnitt 16):** Für Prototyp/Masterarbeit ist Forminit die pragmatische Lösung. Für einen dauerhaften produktiven Einsatz durch das Stadtarchiv wird empfohlen, stattdessen einen kleinen, selbst gehosteten EU-Backend-Dienst (z. B. mit SQLite statt einer großen Datenbank) zu betreiben – damit besteht volle Kontrolle über Speicherfrist, Löschung und Zugriffsrechte. Dieser Wechsel ist durch die strikte Trennung von Formular-Anzeige und `sendeVorschlag()`-Funktion technisch auf eine einzige Datei begrenzt.

**Datenminimierung (Empfehlung für den produktiven Einsatz):** Vor einem echten Einsatz sollte geprüft werden, welche technischen Metadaten (IP-Adresse, User-Agent, Geolokalisierung) der gewählte Formular-Dienst automatisch mitprotokolliert, und ob sich das abschalten lässt – für einen archivarischen Änderungsvorschlag sind diese Daten nicht erforderlich.

---

## 6. Vertrag: Datenlader (`dataLoader.js`)

Der Datenlader liest eine CSV-Datei ein und liefert ein einheitliches Ergebnisobjekt:

```
{
  records: [...],   // eine flache Liste aufbereiteter Datensätze
  schema: {...},    // erkannte Spalten und deren Grundtyp
  errors: [...]     // Liste fehlerhafter/unvollständiger Zeilen mit Grund
}
```

**Klarstellung zu `schema`:** Der erkannte "Typ" bezieht sich ausschließlich auf technische Grundtypen (`text`, `zahl`, `ja_nein`), niemals auf inhaltliche Interpretation. Datumsfelder werden immer als Grundtyp `text` geführt – das steht nicht im Widerspruch zur Freitext-Regel (Abschnitt 12), sondern bestätigt sie: Die Datierungsgenauigkeit wird separat von `datePrecision.js` aus diesem Text abgeleitet, nicht vom DataLoader selbst festgelegt.

**Was der Datenlader nicht tut:** Er gruppiert, aggregiert oder verrechnet nichts vor. Diese Umrechnung erfolgt in der jeweiligen Visualisierungsdatei selbst, mit den gelieferten Rohdaten.

**CSV-Parsing:** Das Einlesen selbst erfolgt über `d3.dsvFormat(';').parse()` (Teil des bereits im Stack vorhandenen D3 v7, Semikolon als Trenner passend zu Abschnitt 12 – **nicht** `d3.csvParse()`, das ist standardmäßig auf Komma als Trenner ausgelegt), nicht über einen selbstgeschriebenen Parser. CSV-Parsing wirkt einfach, ist es aber nicht – Anführungszeichen, Zeilenumbrüche und Semikolons innerhalb einzelner Feldwerte (z. B. in Regesten-Volltexten) führen bei einem selbstgeschriebenen Parser schnell zu Fehlern. D3 löst das bereits robust, unabhängig vom gewählten Trennzeichen.

**UTF-8-BOM automatisch entfernen:** Beim Speichern aus Excel wird häufig ein unsichtbares BOM-Zeichen am Dateianfang gesetzt, das sonst den ersten Spaltennamen verfälscht (z. B. `signatur` würde nicht mehr erkannt). Der DataLoader entfernt dieses Zeichen automatisch beim Einlesen, bevor geparst wird – unabhängig davon, ob eine Datei mit oder ohne BOM gespeichert wurde. Diese Regel gilt zentral für alle CSV-Dateien, Archivar*innen müssen beim Speichern nicht gesondert darauf achten.

**Ableitung berechneter Felder (kein externes Vorverarbeitungsskript):** Alle Werte, die bisher außerhalb des Interfaces (z. B. per separatem Python-Skript) vorab berechnet wurden, werden vom `dataLoader.js` zur Laufzeit im Browser abgeleitet, nicht mehr in einem vorgelagerten, manuell auszuführenden Schritt. Das betrifft insbesondere:
- Umwandlung von Pipe-getrennten Werten in echte Listen (z. B. `orte`, `personen`)
- Ableitung von Unsicherheits-Flags aus den `<feldname>_unsicher`-Begleitfeldern (Abschnitt 11)
- Zahlenextraktion aus unstrukturiertem Rohtext (z. B. Umfangsangaben), mit klar markiertem Fallback bei fehlgeschlagener Extraktion (nicht stillschweigend 0 oder 1 setzen, sondern als unsicher/fehlerhaft kennzeichnen, siehe Abschnitt 12)

Grund: Eine Archivarin ohne Programmierkenntnisse darf nicht darauf angewiesen sein, nach jeder CSV-Änderung manuell ein separates Skript auszuführen, bevor sich etwas im Interface aktualisiert – das widerspräche dem Content-driven-Grundprinzip aus Abschnitt 2.

---

## 7. Vertrag: Zentraler Zustand (`state.js`)

```
{
  aktiverTab: ...,
  aktiveAnsicht: ...,       // deckt sowohl "welche Bestand-Darstellung" (Treemap/Sunburst/...)
                              // als auch "welche Archivalientyp-Ansicht" (Karte/Netzwerk/...) ab
  unsicherheitModusAktiv: true/false,
  filter: {
    entity: { typ: ..., wert: ... },   // z.B. { typ: 'person', wert: 'Maximilian' } oder { typ: 'ort', wert: 'Stein' }
    zeitraum: ...,
    suchbegriff: ...
  },
  datenCache: {...}
}
```

**Warum `entity` statt fester Felder `person`/`ort`:** So lässt sich der Filter später um weitere Entitätstypen (z. B. Körperschaften, Familien, Berufe) erweitern, ohne das State-Schema selbst zu ändern.

Der `filter`-Block ist zentral und wird von allen Visualisierungen gemeinsam genutzt – das ist die technische Grundlage des kontext-erhaltenden Wechsels: Ein Klick auf eine Person setzt `filter.entity`, die als Nächstes geöffnete Ansicht liest diesen Wert aus und zeigt den passenden Ausschnitt.

**Zugriffsregel:** Verändert werden darf der Zustand ausschließlich durch `state.js` selbst, über klar benannte Funktionen. Alle anderen Module dürfen nur lesen.

---

## 8. Vertrag: Navigation/URLs (`router.js`)

Hash-basierte URL-Struktur mit optionalen Filter-Parametern:

```
#bestand
#visualisierungen/urkunden
#visualisierungen/urkunden/karte
#visualisierungen/urkunden/karte?entity_typ=ort&entity_wert=Stein
#visualisierungen/urkunden/personennetzwerk?entity_typ=person&entity_wert=Maximilian
#fuehrungen/ns-zeit
#literatur
#ueber
```

Filter-Parameter in der URL spiegeln den `filter`-Block im zentralen Zustand. Jeder Navigationsschritt erzeugt einen eigenen Browser-History-Eintrag.

---

## 9. Theoretisch-konzeptionelle Leitprinzipien

**Sehr gut abgesichert, tragende Leitprinzipien:**
- **Generous Interfaces / „Show first, don't ask"** (Whitelaw)
- **Information Flaneur**
- **Visual Information Seeking Mantra** (Shneiderman)
- **Progressive Disclosure** – nur so viel Komplexität zeigen wie im Moment nötig; erklärt, warum das Interface nicht alle Visualisierungen gleichzeitig zeigt, sondern schrittweise über „Ansicht wechseln" und Führungen vertieft
- **Archivische Tektonik nach Irmgard Becker**
- **Unsicherheitsvisualisierung** (Windhager/Mayr, Drucker) – siehe Abschnitt 11

**Gut begründet, im Designkapitel zu verorten:**
- **Gestaltgesetze**
- **Nielsens Heuristiken** (v. a. Systemstatus, Konsistenz, Fehlervermeidung)
- **Fitts's Gesetz** – Klickflächen mindestens 44×44 Pixel

**Mit Vorsicht zu verwenden / zu prüfen:**
- **Miller'sches Gesetz (7±2)** – gilt heute als überholt; neuere Literatur geht von weniger gleichzeitig verarbeitbaren Einheiten aus. *Genaue Zitierfähigkeit der neueren Quelle noch über NotebookLM zu verifizieren.*
- **Hick'sches Gesetz** – konkret angewendet: maximal fünf Haupt-Navigationseinträge (Abschnitt 4).

**Bewusster Verzicht, mit Begründung:**
- **Coordinated Multiple Views/Parallax Views** – nicht umgesetzt. Formulierungsvorschlag für den Methodenteil: „Coordinated Multiple Views entfalten ihre Stärken insbesondere in komplexen analytischen Arbeitsumgebungen mit mehreren gleichzeitig sichtbaren Ansichten. Für das hier entwickelte explorative Interface mit einer überwiegend nicht fachkundigen Zielgruppe wurde daher bewusst ein kontext-erhaltender Ansichtswechsel gewählt." Diese Formulierung vermeidet eine zu pauschale Aussage über die gesamte Coordinated-Views-Literatur und bleibt näher an der eigenen, konkreten Entscheidung.

**Zu ergänzen – Begründung der Visualisierungsauswahl:**
Für die Arbeit ist zu klären, warum gerade diese Visualisierungstypen gewählt wurden, nicht andere. Vorschlag für eine Tabelle im Methodenkapitel:

| Visualisierung | Erkenntnisziel |
|---|---|
| Treemap | Mengenverhältnisse zwischen Kategorien |
| Sunburst | Hierarchische Verschachtelung |
| Icicle | Vergleich von Ebenen/Kategorien nebeneinander |
| Circle Packing | Größenverhältnisse innerhalb von Gruppen |
| Gantt-Diagramm | Laufzeiten und zeitliche Überlappungen |
| Karte | räumliche Muster und Häufungen |
| Personennetzwerk | Beziehungen zwischen Akteur*innen |
| Zeitachse | zeitliche Entwicklung und Verteilung |

Diese Tabelle ist als Ausgangspunkt gedacht und im Zuge der Kapitel 4/5-Arbeit zu vervollständigen.

---

## 10. Barrierefreiheit (verpflichtend, nicht optional)

- Vollständige Tastaturbedienbarkeit, sichtbarer Fokus-Zustand, logische Tastatur-Reihenfolge (Tab-Reihenfolge folgt der visuellen/inhaltlichen Reihenfolge)
- Alt-Texte/ARIA-Labels für alle informationstragenden Bilder, Thumbnails, Icons
- **SVG-Accessibility:** D3-generierte SVG-Grafiken benötigen `<title>`- und `<desc>`-Elemente sowie ARIA-Rollen, da Screenreader SVG-Inhalte sonst häufig ignorieren
- **Live-Regionen:** dynamische Inhaltsänderungen (z. B. Tooltip-Text, Filterergebnisse) werden über `aria-live` angekündigt, damit Screenreader-Nutzer*innen sie mitbekommen
- **`prefers-reduced-motion` beachten:** animierte Visualisierungen (Personennetzwerk/Force-Simulation, Circle Packing, ggf. weitere) reduzieren oder deaktivieren Animationen, wenn diese Systemeinstellung aktiv ist
- WCAG-AA-Kontrast (mind. 4,5:1) zwischen Text und Hintergrund
- Farbe ist nie das einzige Unterscheidungsmerkmal
- Semantisches HTML (echte `<button>`-Elemente, korrekte Überschriftenhierarchie)
- Einfache Sprache in Anleitungstexten
- Mindestschriftgröße 16px für Fließtext
- Header: Logo und Hauptnavigation. Footer: Impressum, rechtliche Hinweise, Metanavigation

---

## 11. Uncertainty-Konzept

### Theoretischer Hintergrund
Nach Windhager/Mayr wird Unsicherheit in drei Arten unterteilt (fehlende Daten, umstrittene/mehrdeutige Daten, ungenaue Daten), die jeweils in vier Dimensionen auftreten können (zeitlich, räumlich, kategorial, relational).

### Praktische Umsetzung (Weg A: pro-Feld-Kennzeichnung)
- Bestehendes Feld `erschliessungsstatus` – bezieht sich auf den gesamten Eintrag, bleibt unverändert
- Für jedes inhaltlich unsicherheitsfähige Feld ein eigenes Begleitfeld nach dem Muster `<feldname>_unsicher` mit Werten `ja`/`nein` (z. B. `orte_unsicher`, `personen_unsicher`) – nicht ein einzelner Sammelwert pro Eintrag
- Datumsfelder sind hiervon ausgenommen: ihre Präzision wird automatisch aus dem Freitext abgeleitet (siehe Abschnitt 12), kein eigenes `_unsicher`-Feld nötig, es sei denn, die Unsicherheit betrifft nicht die Präzision, sondern die Richtigkeit des Datums selbst (dann ggf. `datum_unsicher` als eigenständiges Feld, siehe Bestandsaufnahme in `docs/SCHEMA.md`)
- Der Hover-Tooltip zeigt `erschliessungsstatus`, die Liste der konkret als unsicher gekennzeichneten Felder dieses Eintrags, sowie den Inhalt von `unsicherheit_anmerkung` (falls vorhanden) an – so lässt sich gezielt genau das unsichere Feld in der jeweiligen Visualisierung hervorheben (z. B. nur der Ort auf der Karte gestrichelt, während der Personenname normal dargestellt wird), statt den ganzen Eintrag pauschal als unsicher zu markieren. Bei mehreren unsicheren Feldern in derselben Zeile wird im `unsicherheit_anmerkung`-Text der jeweilige Feldname vorangestellt und die einzelnen Erklärungen werden mit Pipe `|` getrennt (folgt der allgemeinen Pipe-Konvention aus Abschnitt 12, der DataLoader zerlegt das automatisch in eine Liste – keine spaltenspezifische Sonderbehandlung nötig). Das allgemeine `anmerkung`-Feld (falls vorhanden) wird NICHT im Unsicherheits-Tooltip angezeigt, um Vermischung mit unrelated archivarischen Notizen zu vermeiden.

### Unsicherheits-Button
Blendet Unsicherheiten ein/aus, dunkelt den Hintergrund ab, unsichere Elemente bleiben hell und behalten gestrichelten Rand + Warnsymbol, schaltet sich bei Ansichtswechsel automatisch aus. Da die Kennzeichnung jetzt pro Feld erfolgt, kann diese Hervorhebung gezielt auf das jeweils betroffene Feld/Element angewendet werden, nicht mehr pauschal auf den ganzen Eintrag.

### Abgrenzung zur technischen Fehlermarkierung (siehe Abschnitt 12)
Die Unsicherheits-Kennzeichnung (inhaltlich, archivarisch begründet, pro Feld) muss sich optisch klar von der Fehlermarkierung (technisch, unvollständige Daten, pro Eintrag) unterscheiden, damit Nutzer*innen nicht beides verwechseln.

---

## 12. Datentabellen – allgemeine Konventionen

- **Format:** CSV, UTF-8
- **Spaltentrenner:** Semikolon `;`
- **Mehrfachwerte:** Pipe `|`
- **Spaltennamen:** Kleinschreibung, Unterstrich statt Leerzeichen, ohne Sonderzeichen/Umlaute
- **Leere Felder:** bleiben leer
- **Ja/Nein-Werte:** `ja` / `nein`
- **Datumsangaben:** Freitext wie überliefert, Datierungsgenauigkeit automatisch aus dem Textformat abgeleitet
- **Mindestfelder:** eindeutige ID/Signatur, Bezeichnung. `erschliessungsstatus` ist empfohlen, aber nicht zwingend – eine Tabelle kann bewusst darauf verzichten, wenn `unsicherheit_anmerkung` dieselbe Funktion (Einordnung der Erschließungs-/Unsicherheitslage) abdeckt. Zusätzlich für jedes inhaltlich unsicherheitsfähige Feld ein Begleitfeld `<feldname>_unsicher` (siehe Abschnitt 11) – welche Felder das im Einzelnen sind, ist archivalientypspezifisch und wird in `docs/SCHEMA.md` festgehalten. Bei mindestens einem unsicherheitsfähigen Feld: zusätzlich `unsicherheit_anmerkung` (Text, Grund der Unsicherheit, für Hover-Tooltip) – getrennt vom allgemeinen `anmerkung`-Feld, um Vermischung mit unrelated Notizen zu vermeiden.

**Fehlermarkierung (konkret):** Ein unvollständiger/fehlerhafter Eintrag erhält einen auffällig farbigen Rahmen (abweichend von der Unsicherheits-Kennzeichnung) und im Tooltip den Hinweistext „Datensatz unvollständig" statt einer inhaltlichen Unsicherheitsangabe. Fehlerhafte Einträge werden nie stillschweigend ausgeblendet.

**Orte/Geodaten:** eigene Tabelle `orte.csv` (Ortsname, Latitude, Longitude, Erschließungsstatus). Andere Tabellen referenzieren Orte nur über den Ortsnamen.

Konkrete Spaltenlisten pro Archivalientyp werden in `docs/SCHEMA.md` gepflegt.

**Pflegeregel für SCHEMA.md:** Claude Code darf `docs/SCHEMA.md` um neue Tabellen/Spalten ergänzen, wenn eine neue CSV-Datei hinzukommt. Bestehende, bereits dokumentierte Spalten dürfen nicht eigenmächtig geändert oder entfernt werden – das erfordert eine ausdrückliche Rückfrage.

---

## 13. Code Generation Rules

1. **Keine globalen Variablen** außer klar deklarierten technischen Konstanten (z. B. `CAT_COLORS`).
2. **Eine Datei, eine Aufgabe.** Jede Visualisierung eine eigene Datei nach dem Modul-Interface aus Abschnitt 5.
3. **Kurze Funktionen mit sprechenden Namen.** Richtwert: möglichst unter 40 Zeilen, harte Obergrenze 100 Zeilen. Namenskonvention: camelCase für Variablen/Funktionen, PascalCase für komponentenartige Bausteine, kebab-case für Dateinamen. Keine Namen wie `data`, `info`, `temp`.
4. **DRY.** Wiederkehrende Logik wird in `utils/` ausgelagert.
5. **Tell, Don't Ask.** Der Datenlader liefert flache, saubere Datensätze (Abschnitt 6).
6. **Kommentare erklären das Warum, nicht das Was.**
7. **Pfadfinder-Regel.**
8. **Datenehrlichkeit hat Vorrang vor Code-Eleganz.**
9. **Testbarkeit gemeinsam genutzter Module.** `state.js`, `dataLoader.js` und `router.js` müssen unabhängig von den übrigen Modulen und voneinander nachvollziehbar/prüfbar sein (klare Verantwortlichkeit, keine versteckten Abhängigkeiten zwischen ihnen). Das bedeutet nicht zwingend automatisierte Tests, aber eine Trennung, die es erlaubt, jedes dieser drei Module für sich zu prüfen, ohne die anderen mitzudenken.

### Zusätzliche technische Detailregeln
- Längere blockierende Hauptthread-Berechnungen sind nach Möglichkeit zu vermeiden – dies ist ein Entwicklungsziel, keine technisch hart garantierbare Eigenschaft (die tatsächliche Dauer hängt von Gerät, Browser und Datenmenge ab). D3-Force-Simulationen (Personennetzwerk) werden schrittweise über `requestAnimationFrame` statt in einem Rutsch berechnet; bei großen Netzwerken kann eine niedrigere Start-Alpha (`simulation.alpha(0.3)` statt Standardwert) helfen, die Berechnung spürbar zu entzerren.
- Icicle-Diagramm immer vertikal.
- Tooltips immer mit Rand-Clamping.
- Farben ausschließlich aus `CAT_COLORS`.
- Lazy Loading: Visualisierungscode und -daten erst bei erstmaligem Aufruf laden.

### Regressionsschutz
Nach jeder Änderung an einer gemeinsam genutzten Datei kurz erwähnen, welche anderen Visualisierungen betroffen sein könnten.

---

## 14. Projektprotokoll

Claude Code führt `docs/PROJEKTLOG.md` und fragt in gewissen Abständen von sich aus nach, ob Änderungen dort festgehalten werden sollen. Ziel: eine spätere aktualisierte Fassung dieses Masterprompts auf Basis des tatsächlichen Projektstands.

**Breaking Changes:** Eine bestehende, bereits verwendete Schnittstelle (Modul-Interface aus Abschnitt 5, State-Schema aus Abschnitt 7, CSV-Spaltenstruktur aus `docs/SCHEMA.md`) darf nicht ohne ausdrückliche Rückfrage geändert werden, auch wenn die Änderung technisch sinnvoll erscheint. Claude Code beschreibt stattdessen die vorgeschlagene Änderung und deren Auswirkungen und wartet auf Bestätigung.

---

## 15. Was Claude Code nicht tun soll

- Frameworks, Build-Tools oder npm-Pakete vorschlagen oder einbauen
- Archivarische Inhalte als feste Werte im JavaScript-Code einbetten
- CSV-Spaltenstrukturen eigenmächtig ändern
- Funktionen über 100 Zeilen schreiben, ohne vorher nachzufragen
- Krems-spezifische Inhalte fest in generischen Code schreiben
- Fehlerhafte/unvollständige Datensätze stillschweigend ausblenden
- Eine zentrale `config.json` für archivarische Inhalte einführen
- Coordinated Multiple Views / gleichzeitig sichtbare, live verknüpfte Ansichten einbauen
- Partizipations-Vorschläge automatisch und ungeprüft in die kuratierten CSV-Dateien schreiben (siehe Abschnitt 5a – ausschließlich manuelle Prüfung)
- Partizipations-Endpunkt oder EIN/AUS-Schalter hartkodieren statt über `constants.js`
- Formular-Anzeige und Versand-Funktion des Partizipations-Moduls in einer einzigen, untrennbaren Funktion vermischen
- Fehlermarkierung optisch identisch zur Unsicherheits-Markierung gestalten

---

## 16. Ausgeklammert für später

- **Setup-Wizard** für generische Nachnutzung durch andere Gemeindearchive.
- **Selbst gehosteter EU-Backend-Dienst für die Partizipationskomponente** (siehe Abschnitt 5a) – für einen dauerhaften produktiven Einsatz durch das Stadtarchiv empfohlen, als Ersatz für die Forminit-Prototyp-Lösung. Technisch auf den Austausch der `sendeVorschlag()`-Funktion begrenzt.

---

## 17. Offene Bestandsaufnahme (vor Beginn der Neuprogrammierung zu klären)

**Teil A – Urkunden:** benötigte Datenfelder pro Visualisierung, Herkunft (Datei vs. hardcoded, alle Stellen auflisten), Pflicht/Optional, Format, Berücksichtigung des Erschließungsstatus, Funktionsweise der Datierungspräzisions-Erkennung, Umgang mit undatierten Einträgen.

**Teil B – Bestandsverzeichnis:** dieselben Fragen wie Teil A, zusätzlich Struktur der Hierarchie-Ebenen, Berechnungsgrundlage der Kachel-/Segmentgröße.

**Teil C – Barrierefreiheit:** aktuell verwendete Schriftgröße, WCAG-Konformität, Fundstellen im Code.

Ergebnis als Tabelle, keine Änderungsvorschläge oder Code-Umbauten in diesem Schritt.

---

*Stand: wird laufend über `docs/PROJEKTLOG.md` aktualisiert.*
