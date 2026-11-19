# Material für das Kapitel zur Prüfmethode und zu den Grenzen

Stand 18.11.2026. Zusammenstellung vorhandener Befunde mit Verweis auf die Quelle. Hier wird nichts neu behauptet oder
bewertet. Verweise: **PL** = `docs/PROJEKTLOG.md` (Eintragsnummer), **CL** = `docs/CHANGELOG.md` (Nummer),
**PR** = `docs/PRUEFUNGEN.md`, **SCH** = `docs/SCHEMA.md`, **EM** = `docs/EIGNUNGSMATRIX_UNSICHERHEIT.md`. Prüfdateien liegen
außerhalb des Repositorys in den Arbeitsordnern (`Nachbesserung_2026-11-15/`, `Unsicherheitstypen_2026-11/`).

## 1. Grenzen der Prüfmethode

| Befund | Beleg |
|---|---|
| Die automatischen Prüfungen (axe, Sitzungsbedienung, Tests) liefen bei festen Fenstergrößen (meist 1366 × 900, 1366 × 768). Dass der Stammbaum auf dem Laptop des Autors nur den Hinweis „größerer Bildschirm“ zeigte, fand der Autor, nicht die Prüfungen; die Grenze lag bei rund 717 px Fensterhöhe. | PL 91, Punkt 1; CL 239 |
| Seitdem wird zusätzlich bei 1280 × 720 und weiteren Laptop-Größen geprüft (Stammbaum-Abnahme in sieben Größen). | PL 91; PL 95, Punkt 4 |
| Der Befund in der Bilderwand (Klickziele bei 768 px Höhe) erschien erst, als axe mit den Regeln aus WCAG 2.2 (`wcag22aa`, Regel `target-size`) lief. Frühere Angaben „axe 0 Verstöße“ (z. B. 124 Zustände am 15.11.2026) gelten für die damals geprüften Fenstergrößen und Regelsätze. | PL 96, Punkt 4; PR (Grenzen der Prüfmethode); PL 93 (124 Zustände) |
| Kontraste: Texte über Karte und SVG, die axe als „incomplete“ meldet, wurden in Nachbesserung 6 am Element nachgerechnet (227 Texte, 225 bestanden, 2 Messfehler). Die Kontraste der Muster und Linien im Modus „Licht aus“ sind aus den Farbwerten berechnet; die Farbfehlsicht wurde an Bildern pixelweise simuliert. Eine Messung am Bildschirm gibt es nicht. | PL 87 (Kontrast, Punkt 4); PL 95 (Stufe A, `a13/BERICHT_STUFE_A.md`); PR |
| Die Erklärung beim Überfahren eines Felds in der Regesten-Kachel gibt es nur mit der Maus. Tastatur und Touch erreichen dieselbe Erklärung über den Fokus auf die Kachel bzw. das Aufklappen, Bildschirmleser über die Beschreibung der Kachel. | PL 96, Punkt 2; PR |
| Der Entwurf des Modus wurde zuerst an einer Attrappe geprüft. Dort ergab das Abdunkeln über Deckkraft 623 axe-Verstöße beim Kontrast. Die Freigabe verlangte, alle Prüfungen an der echten Umsetzung zu wiederholen. | PL 95 (Stufe A, Entscheidung 13); EM, Abschnitt 1 (Abdunkeln) |
| Kartenkacheln werden in den Prüfskripten nicht aus dem Netz geladen (Anfragen an fremde Server werden abgebrochen); geprüft wird ohne Kartenbild. Die Kacheln kommen auf der veröffentlichten Seite von OpenStreetMap. | Prüfskripte, z. B. `Unsicherheitstypen_2026-11/a13/werkzeuge/b_rundgang.mjs` (Schalter `MIT_KACHELN`); externe Domains: PL 45. Dass die Prüfungen ohne Kacheln laufen, ist im Repository sonst **nicht dokumentiert**. |
| Tastaturdurchgang: alle Bedienelemente erreichbar außer den Links im zugeklappten Impressum; im Modus σ, Leistenknöpfe, Leertaste, Aufklapper und Esc geprüft. | PR (Stand 15.11.2026); PL 87; PL 95 (Regression) |
| Die Wirkung des σ-Knopfs wurde in Auftrag 13 nur über eine Art der Kennzeichnung (hell markiert) gezählt. Kennzeichnungen durch Einblenden oder Stricheln entgingen der Zählung. | PL 96, Punkt 5; PR |
| Messungen am Bildschirmfoto treffen leicht Fremdes: einen beim Fokus erscheinenden Hinweis-Kasten, Bereiche außerhalb des Fensters, die Kantenglättung von Buchstaben, Strichlücken eines gestrichelten Rahmens. Auffällige Werte (1,0 im Strahl, 1,11 in der Sonne) waren so entstanden und wurden am Bild belegt, nicht angenommen. | PL 100, Punkt 6; PR (Grenzen der Prüfmethode) |
| Kontraste von Schrift auf Schraffur: Ohne Unterlage hielt die Beschriftung im Baum im ungünstigsten Pixel nur 2,4:1; erst die Messung am Bild zeigte das. | PL 100, Punkt 4 |
| Die 8 464 offenen axe-Fälle (Auftrag 18) gehen vor allem auf Text in SVG zurück (über 3 800, axe kann dort den Grund nicht bestimmen), auf Hintergrundbilder und Verläufe. In einer geschichteten Stichprobe mit 321 gewerteten Elementen bestanden 97,5 %. Die 8 Durchfälle betreffen alle dieselben vier Ursachen. Eine Stichprobe belegt keine Vollständigkeit; Text über den Kartenkacheln blieb ungemessen, 106 Proben blieben zunächst ohne Wert (siehe nächste Zeile). | PL 101, Punkt 3; PR (Grenzen der Prüfmethode) |
| Messen am Bild braucht eine Gegenprobe: Die ersten Fassungen des Werkzeugs blendeten mit dem Text auch den eigenen Hintergrund aus und lasen dadurch Werte um 1:1. Erst ein Selbsttest an bekannten Farben (4,48 / 4,54 / 9,08 / 2,31) machte die Messung belastbar. | PL 101, Punkt 3 |
| Wiederholung der Stichprobe nach den Korrekturen (Auftrag 19), an denselben Elementen und mit demselben Verfahren: Die 8 Mängel sind behoben, keine Probe fällt mehr durch, kein Element ist mehr als Messrauschen schlechter geworden. Die Stichprobe ist nicht zufällig gezogen und erlaubt keine Aussage über die Gesamtheit. Dabei zeigte sich, dass die 106 in Auftrag 18 als „außerhalb des Bildes“ gemeldeten Proben sichtbar waren: Das Werkzeug hatte Fehler beim Bild verschluckt. 34 davon sind jetzt gemessen (alle bestanden), 72 lassen sich mit dem Verfahren nicht trennen. | PL 102, Punkt 5; PR (Grenzen der Prüfmethode) |
| Ein Mangel außerhalb der Stichprobe fiel erst bei der Nachrechnung auf: weiße Namen auf dem goldenen Abschnitt im Stammbaum (2,42:1). Pixelmessungen an sehr kleiner Schrift waren dort unbrauchbar; erst der Vergleich von Schrift und Kästchenfüllung zeigte den Befund. | PL 102, Punkt 5 |

## 2. Entscheidungen mit Begründung und Folgen

| Entscheidung | Begründung und Folge | Beleg |
|---|---|---|
| Eigener Typ `identifikation` („Wer ist gemeint?“) | Ergänzung des Projekts, nicht bei Windhager, Salisu, Mayr (2019). In den Urkunden 85 Fälle, im Stammbaum keine. | PL 94 (Vokabular); PL 95; `data/unsicherheit_typen.csv` |
| Keine Farbumkehr im Modus | Zweite Palette statt Inversion; Fotos, Kategorie- und Familienfarben bleiben, Kartenkacheln nur über Helligkeit und Sättigung. | PL 95 |
| Schwelle für Massenangaben ausgeschaltet | Zunächst 30 %: Gruppen ab diesem Anteil zählten bei „Alle“ nicht mit. Tabelle für 20–40 %: Ausstellungsort fehlt 53,5 %, Wirtschaftssektor fehlt 44,8 %, soziale Gruppe angenommen 31,2 %, Geburtsdatum ungenau 25,0 %, Ort mehrdeutig 23,0 %. Seit 16.11.2026 ausgeschaltet; „Ausstellungsort fehlt“ zählt mit, „Alle“ in den Regesten 687 statt 213. Der Parameter bleibt (`js/config/lichtAus.js`). | PL 95, Punkt 3 (Tabelle); CL 243; EM, Abschnitt 3 |
| Filtern in Regesten und Karte, Abdunkeln im Stammbaum | Der Modus zeigt in Regesten und Karte nur die betroffenen Elemente (687 von 1067, 100 von 224). Im Stammbaum ließen herausgefilterte Personen Lücken in den Linien; er dunkelt ab (26 von 75 hell). | CL 243; EM, Abschnitt 1 (Filtern); PL 96 (Regression) |
| Markergröße fest | Die Skala der Karte kommt aus allen Orten des Zeitraums, nicht aus den gefilterten; derselbe Ort ist in beiden Zuständen gleich groß. | PL 96, Punkt 3 |
| Typen mit nur einem Fall | „Einzelangabe“ (Fotos, StAK-UrkSt-0004) erscheint mit 1. Das Schema kennt Typen, die in den Daten kaum vorkommen; „Überlieferung“ und „Herkunft“ kommen nur im Bestandsverzeichnis vor. | PL 95, Nachtrag 18.11.2026; `Unsicherheitstypen_2026-11/a15/pruefblatt_daten.csv`, Fall 6 |
| Zeitachse und Bilderwand zählen die neuen Spalten nicht mit | `ausstellungsort_unsicher` und `kategorien_unsicher` wirken nur in Regesten und Detailansicht; σ hat in den übrigen Ansichten bis zu ihrer Umstellung die ältere Bedeutung (etwa 475 Urkunden kämen dazu). | PL 95, Nachtrag 18.11.2026; CL 244 |
| σ-Knopf bleibt in Kategoriefluss und Verbindungskarte | Er blendet im Kategoriefluss die Knoten „(ohne Kategorie)“ und „(kein Ort)“ ein und strichelt in der Verbindungskarte Verbindungen mit unsicherer Ortsangabe. Ausblenden hätte Urkunden ohne Kategorie oder Ort unsichtbar gemacht. | PL 96, Punkt 5 (Entscheidung des Autors) |
| `unsicherheit_anmerkung` auch für Hinweise ohne Unsicherheit | Schemamangel: Bei StaAKr-0007, -0008, -0876 (und 6 Zeilen in Personenliste und Inventaren) stehen Vermerke wie „Doppelt erfasst“ in der Spalte für Unsicherheit; der alte σ-Filter zählt sie mit. Nicht behoben, Vorschlag im Prüfblatt. | PL 95, Nachtrag 18.11.2026; `a15/pruefblatt_daten.csv`, Fall 4 |
| Standardtexte statt gleichlautender Anmerkungen | Erklärungen für Felder ohne eigene Anmerkung stehen einmal je Datei, Feld und Ausprägung in `data/unsicherheit_standardtexte.csv`. | SCH 13.11; CL 244 |
| Kleine Segmente der Sonne: Betroffene Bestände sind in der Übersicht bis 1,3 px schmal; dort trägt nur der Rahmen, nicht das Muster der Ausprägung. | PL 100, Punkt 5; EM, Abschnitt 1b |
| Filtern im Strahl, Abdunkeln in Baum und Sonne: Filtern würde dort die Flächen bzw. Winkel aller übrigen Bestände ändern. | PL 100, Punkte 3–5; EM, Abschnitt 1b |
| Laufzeit eines Bestands = überlieferte Spanne (Festlegung des Autors, 19.11.2026) | Fehlende Jahrgänge dürfen davor oder danach liegen. Die Kammeramtsrechnungen (Laufzeit 1516–1782, fehlend unter anderem 1783–1785) sind damit kein Fehler. Weil die Lücke hinter dem Balkenende nur etwa 3 px breit ist, nennt der Strahl sie in Worten („1783–1785 nach Ende“). | PL 101, Punkt 1; `docs/SCHEMA.md` |
| Text wird nicht über die Deckkraft gedimmt, auch nicht im alten σ-Abdunkeln (Auftrag 19) | Vorher fielen Achsen und Namen auf 1,1 bis 1,9:1. Jetzt tritt nicht betroffener Text über eine eigene Farbstufe zurück (5,4:1), Flächen und Linien dimmen wie bisher. | PL 102, Punkt 1; EM, Abschnitt 3 |

## 3. Datenqualität und Herkunft

| Befund | Beleg |
|---|---|
| Die Ortsliste enthielt Einträge, die keinen Ort meinen (Namensbestandteile). Neue Spalte `ortsart` (44 Einträge geprüft, 2 als `Herkunftsname`); die übrigen 212 sind nicht einzeln geprüft (leer = Siedlung). | PL 93 (B1); SCH (orte.csv) |
| Bei 10 Orten wurden Koordinaten geleert statt geraten, weil sie vermutlich auf einen gleichnamigen anderen Ort zeigten; die Herkunft der Koordinaten ist nicht nachweisbar. | PL 93 (B2) |
| Kategorien der Urkunden: nach den Namen des Dokumentationsprofils nach Becker, automatisch zugeordnet und stichprobenartig geprüft (Angabe des Autors). | SCH (urkunden.csv, `kategorien`); `data/methodenhinweise.csv` |
| Kategorien der Bestände (`bkk_kategorie`): „Oberkategorie nach Becker“. Wie die Zuordnung entstand, ist **nicht dokumentiert**. | SCH (bestandsverzeichnis.csv) |
| Geschlecht in den Verlassenschaftsinventaren: nach dem Namen geschätzt, eine Projektentscheidung; in der Vorlage wird „geschätzt“ nicht näher erläutert. | SCH (verlassenschaftsinventare.csv, `Geschlecht (Schaetzung)`); PL 93 |
| Bürgerbuch: Bei 11 Einträgen liegt das Datum bei „Erstmalig vorstellig am“ laut Vorlage nach dem Aufnahmedatum; als Befund der Vorlage vermerkt, nicht korrigiert. | PL 93 (A6) |
| Ausstellungsort: 496 Werte aus dem Regest (427 direkt, 65 über eine Zuordnungstabelle, 4 Feldlager als Text), 571 leer. Fünf Zuordnungen als prüfbedürftig gemeldet. | PL 94; `Unsicherheitstypen_2026-11/a12/BERICHT_STUFE_A.md`; `a15/pruefblatt_daten.csv`, Fall 3 |
| StaAKr-0258 hängt an Rappottenstein, das Regest nennt den Ort nicht; Herkunft der Zuordnung **nicht dokumentiert** (seit dem ersten Datenstand). | PL 93 (B1); `a15/pruefblatt_daten.csv`, Fall 2 |
| Lücken im Bürgerbuch: In den Daten haben die Jahre 1570, 1572, 1590, 1591, 1593, 1594, 1598 und 1599 keinen Eintrag. Die Vorlage nennt Lücken allgemein (S. 20) und eine Datumslücke 1619 (S. 147); ob Aufnahmen fehlen oder die Überlieferung, sagt sie nicht. | PL 100, Punkt 1; `data/methodenhinweise.csv` (`buergerbuch_luecken`) |
| Kammeramtsrechnungen (1.2.2.2.1.): Das Bestandsverzeichnis nennt fehlende Jahrgänge bis 1785, die Laufzeit endet 1782. Zuerst als Widerspruch in der Vorlage gemeldet; nach der Festlegung, dass die Laufzeit die überlieferte Spanne ist, kein Fehler (siehe Abschnitt 2). Kein anderer Bestand nennt Lücken außerhalb der Laufzeit. | PL 100, Punkt 2; PL 101, Punkt 1; `tests/bestandLichtAus.test.mjs` |
| Fehlende Bürgen: 330 von 2791 Einträgen nennen einen Bürgen (1541–1621); laut Vorlage sind Bürgen nur im besten Fall angegeben. Die Einträge ohne Bürgen sind trotzdem markiert, mit dieser Einschränkung im Standardtext. | PL 99, Punkt 4; `data/methodenhinweise.csv` (`buergschaften`) |

## 4. Korrigierte Fehlannahmen

| Frühere Annahme | Berichtigung | Beleg |
|---|---|---|
| „Der σ-Knopf hat in Kategoriefluss und Verbindungskarte keine sichtbare Wirkung.“ | Er wirkt in beiden; gezählt war nur eine Art der Kennzeichnung. | PL 95, Punkt 11 (mit Verweis); PL 96, Punkt 5 |
| „Der Info-Text der Bilderwand verdeckt zwei Laschen.“ | Der Kopfbereich scrollte beim Fokus auf den Info-Text; die Fläche einer schrägen Ortsbeschriftung lag dann über den Laschen. | PL 96, Punkt 4 |
| „StaAKr-0521 ist kein Feldlager.“ (Rückmeldung zu Auftrag 13, 18.11.2026) | Das Regest beginnt „Im Feld zu Ernberg in Flandern“; der Ausstellungsort ist wie bei 0506, 0517, 0518 ein Feldlager-Text. | PL 97, Punkt 2; `a15/pruefblatt_daten.csv`, Fall 1 |
| „Die Verbindungskarte verliert die Ortswahl beim Umschalten von σ“ betraf auch andere Ansichten. | Ebenso Karte Soziale Gruppen und Urkunden-Netzwerk (dort über den zentralen Sidebar-Umschalter); behoben. | PL 97, Punkt 1 |
