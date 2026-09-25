// js/core/visualisierungsTabs.js
// AUFTRAG "Permanente Tab-Leiste statt dynamischer Multi-Tabs (Pilot:
// Urkunden)" (CHANGELOG 42): ersetzte die zuvor gebaute Multi-Tab-Funktion
// durch eine PERMANENTE Tab-Leiste, die immer ALLE Visualisierungen des
// Bereichs zeigt und dauerhaft vertikalen Platz belegte (eigene Grid-Zeile).
//
// FOLGEAUFTRAG "Visualisierungs-Tab-Leiste als Hover/Klick-Flyout + Galerie-
// Muster für Bestand" (CHANGELOG 44): die Tab-Leiste wurde ein Hover/Klick-
// FLYOUT, verankert am aktiven Bereichs-Leiste-Eintrag bzw. dem "Bestand"-
// Hauptnav-Link. `position: fixed` statt einer Grid-Zeile.
//
// FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation" (AKTUELLER STAND):
// erweitert das Flyout-Muster auf zwei weitere Stellen (Details siehe
// app.js/bereichsLeiste.js) - dafür ist die bisherige, monolithische
// verankereFlyout()-Implementierung in einen gemeinsamen Kern
// (erzeugeFlyoutPanel(), EXPORTIERT, neu) und drei darauf aufbauende
// Varianten aufgeteilt:
//   - verankereFlyout() (UNVERÄNDERTE Signatur/Verhalten): Klick auf den
//     Auslöser TOGGLET den Flyout (kein preventDefault-Nebeneffekt nötig, da
//     der Auslöser ohnehin ein reiner "#"-Anker ohne echtes Sprungziel ist) -
//     weiterhin für den jeweils AKTIVEN Bereichs-/Bestand-Kontext, dessen
//     aktiverId sich per .aktualisiere() live mitändert (unverändert aus (44)).
//   - verankereVorschauFlyout() (NEU): reiner Hover-Flyout OHNE eigene
//     Klick-Verdrahtung am Auslöser - der Auslöser hat hier immer schon eine
//     ANDERE, eigene Klick-Funktion (z.B. bereichsLeiste.js' eigener
//     Navigations-Klick auf einen INAKTIVEN Bereichs-Tab, Punkt 3), die
//     dieser Flyout nicht stören/doppelt behandeln darf - ein zusätzlicher
//     Klick-Handler mit eigenem preventDefault() hätte hier genau das
//     Doppel-Listener-Problem verursacht, das (44)s app.js-seitiger Klick-
//     Guard für den AKTIVEN Fall extra löste.
//   - verankereIconFlyout() (NEU): wie verankereVorschauFlyout(), aber mit
//     Icon+Name-Kacheln statt Text-Pillen (Punkt 2: "Bestand"-Hauptnav-Hover)
//     UND einer eigenen Klick-Behandlung, die den Flyout nur SCHLIESST, ohne
//     preventDefault - der Auslöser ("Bestand") ist hier ein ECHTER Anker
//     (href="#bestand"), dessen normale Navigation beim Klick ausdrücklich
//     weiterlaufen soll (Punkt 2: "Klick auf 'Bestand' selbst... führt
//     weiterhin zur Galerie-Seite").
//
// UX-ENTSCHEIDUNG "Flyout nach Tab-Klick schließen ja/nein" (aus (44)
// übernommen, gilt unverändert für alle vier Varianten): JA, schließt
// sofort nach Klick auf einen Eintrag. Begründung: der Flyout überlappt
// genau die Fläche, auf der das Klick-Ergebnis erscheint - bliebe er offen,
// würde er die eigene Auswahl des Nutzers verdecken. Ein Klick ist ein
// abgeschlossener Entscheidungsakt (anders als Hover), sofortiges Schließen
// liefert unmittelbares Feedback.
//
// FOLGEAUFTRAG "Flyout-Kette bleibt offen bis Klick, einheitliche
// Positionierung auf allen Ebenen" (CHANGELOG 47): ersetzt das bisherige
// mouseleave+200ms-Debounce-Schließen (aus (44)/(45)) durch einen
// GLOBALEN, EINMALIGEN Klick-außerhalb-Listener (siehe
// stelleGlobalenKlickListenerSicher() unten). Grund für die Ablösung: bei
// verschachtelten Ketten (Visualisierungen → Bereichs-Leiste-Vorschau →
// Bereichs-Tab-Flyout) liegen die Panels der einzelnen Ebenen als
// GESCHWISTER direkt in <body> (siehe erzeugeFlyoutPanel()s
// Baustein-Kommentar), nicht ineinander verschachtelt - die Maus verlässt
// beim Wandern von einer Ebene zur nächsten also zwangsläufig kurzzeitig
// sowohl Auslöser als auch Panel der ÄUSSEREN Ebene, was das alte
// mouseleave-Timing unabhängig von der Debounce-Dauer irgendwann als
// "Nutzer verlässt das Menü" fehlinterpretierte (genau das vom Auftrag
// beschriebene Problem). Die neue Lösung macht das TIMING komplett
// irrelevant: Hover ÖFFNET weiterhin (unverändert), aber NICHTS schließt
// mehr automatisch durch Mausbewegung - nur ein Klick auf einen Eintrag
// (bestehende, unveränderte Klick-Handler s.u.) oder ein Klick außerhalb
// der gesamten offenen Kette (neu, global) schließt. Praktischer Zusatz-
// Effekt: der globale Schließen-Check schließt dabei auch ÄUSSERE Ebenen
// korrekt mit, wenn auf einen Eintrag in einer verschachtelten, aber DOM-
// weit getrennten inneren Ebene geklickt wird (Klick-Ziel liegt dann
// außerhalb des äußeren Panels/Auslösers) - ergänzt/überschneidet sich mit
// app.js' bereits bestehendem, expliziten `zusaetzlichSchliessen`-Mechanismus,
// der deshalb unverändert bleiben kann (beide Wege sind idempotent, siehe
// schliesse()s eigene offen-Prüfung).
//
// Gemeinsame Positionierungs-Funktion (Punkt 2 desselben Folgeauftrags):
// erzeugeFlyoutPanel()s positioniere() war schon VOR diesem Auftrag die
// einzige Stelle, die die Position irgendeines der vier Flyout-Typen
// berechnet (alle vier Varianten bauen auf demselben Kern auf) - die
// Korrektur (X-Position jetzt am Auslöser statt an #app-content
// ausgerichtet, siehe dortiger Kommentar) musste deshalb nur an dieser
// EINEN Stelle vorgenommen werden, keine neue Hilfsfunktion nötig.
//
// FOLGEAUFTRAG "Flyouts schließen sich nicht mehr gegenseitig - Stapel-Bug
// beheben" (AKTUELLER STAND): (47) löste das Schließen-durch-Wegbewegen-
// Problem, öffnete damit aber eine neue Lücke - da NICHTS mehr automatisch
// schließt, blieben beim NACHEINANDER-Hovern mehrerer UNVERWANDTER
// Auslöser (z.B. mehrere Bereichs-Tabs der Reihe nach) alle dabei
// geöffneten Panels gleichzeitig sichtbar/überlappend liegen. Fix: JEDE
// oeffne() prüft jetzt zuerst, welche anderen aktuell offenen Instanzen
// NICHT zur selben Kette gehören (= deren Panel den eigenen Auslöser nicht
// enthält) und schließt genau diese (schliesseGeschwister(), s.u.) - echte
// Vorfahren (verschachtelte Ketten wie "Visualisierungen" → "Bürgerbuch")
// bleiben davon unberührt, siehe dortiger Kommentar für die genaue
// Containment-Logik. BEWUSST in oeffne() selbst statt einer zweiten,
// parallelen Implementierung (z.B. nur für einen der vier Flyout-Typen) -
// dieselbe EINE Funktion bedient dadurch weiterhin alle vier Varianten UND
// sowohl Hover- als auch Klick-ausgelöstes Öffnen einheitlich.
//
// Baustein-Muster (Abschnitt 5): kennt selbst weder router.js noch die
// echten Visualisierungsmodule. Jede verankereXyz()-Funktion baut sich ein
// eigenes <div> in <body> (nicht im Container des Auslösers - braucht
// `position:fixed` unabhängig von dessen Stapelkontext) und meldet Klicks
// über options.onAktivieren(id) zurück - app.js/bereichsLeiste.js
// entscheiden die eigentliche Navigation.
//
// Punkt 3 (Hover-Tooltip mit Icon, verankereFlyout()/verankereVorschauFlyout()):
// unverändert aus (41)/(42)/(44) übernommen - nutzt weiter js/utils/tooltip.js
// (Node-Inhalt-Erweiterung aus (41)).

import { erzeugeVizIcon } from '../utils/vizIcons.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';

// FOLGEAUFTRAG "Flyout-Kette bleibt offen bis Klick...": alle lebenden
// erzeugeFlyoutPanel()-Instanzen (offen oder nicht) - der globale
// Klick-Listener (siehe stelleGlobalenKlickListenerSicher()) iteriert
// darüber, um bei JEDEM Klick zu prüfen, welche offenen Panels außerhalb
// des Klicks liegen und deshalb zu schließen sind. Ein Set statt eines
// Arrays, damit destroy() sich selbst ohne Suche wieder entfernen kann.
const FLYOUT_INSTANZEN = new Set();
let globalerKlickListenerAktiv = false;

// Wird EINMALIG (beim allerersten erzeugeFlyoutPanel()-Aufruf) registriert,
// nicht pro Instanz - ein einzelner document-Listener statt vieler
// identischer reicht aus, da FLYOUT_INSTANZEN ohnehin alle Instanzen kennt.
// Bubble-Phase (kein capture): dadurch laufen die spezifischen Klick-
// Handler der einzelnen Varianten (verankereFlyout()s Toggle,
// verankereIconFlyout()s Schließen, baueTabStreifen()/baueIconListe()s
// Eintrag-Klicks) IMMER zuerst (Ziel-Element vor document in der
// Bubble-Reihenfolge) - der globale Check sieht deshalb bereits den
// aktuellen (evtl. durch den spezifischen Handler gerade erst
// aktualisierten) offen-Zustand jeder Instanz.
function stelleGlobalenKlickListenerSicher() {
  if (globalerKlickListenerAktiv) return;
  globalerKlickListenerAktiv = true;
  document.addEventListener('click', (event) => {
    FLYOUT_INSTANZEN.forEach((kern) => {
      if (!kern.istOffen()) return;
      const zielImPanel = kern.panel.contains(event.target);
      const zielAmAusloeser = kern.ausloeser.contains(event.target);
      if (!zielImPanel && !zielAmAusloeser) kern.schliesse();
    });
  });
}

// FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation": exportiert, damit
// app.js' verankereHauptnavFlyouts() diese Regeln auch für den "Visualisierungen"-
// Hauptnav-Flyout einspielen kann, dessen Panel es (mangels passender Vorlage
// unter den vier verankereXyz()-Funktionen hier: sein Inhalt ist
// bereichsLeiste.js' Vorschau-Rendering, nicht baueTabStreifen()/baueIconListe())
// direkt über erzeugeFlyoutPanel() aufbaut, statt eine der vier Varianten zu
// verwenden.
export function fuegeFlyoutStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .visualisierungs-tabs-flyout { position: fixed; z-index: 60; background: var(--surface);
      border: 1px solid var(--border); border-top: none; border-radius: 0 0 var(--radius) var(--radius);
      box-shadow: var(--shadow); padding: var(--space-2) var(--space-3); box-sizing: border-box; }
    .visualisierungs-tabs-flyout[hidden] { display: none; }
    .visualisierungs-tabs { display: flex; flex-wrap: wrap; gap: var(--space-1); }
    .visualisierungs-tab { display: inline-flex; align-items: center; min-height: 44px;
      padding: var(--space-2) var(--space-3); font-family: inherit;
      font-size: calc(var(--fs-sm) * 0.875); /* AUFTRAG "Schriftgröße der Visualisierungs-Tab-Leiste
      verkleinern": ~87,5% von var(--fs-sm) (Bereichs-Leiste) - dasselbe Verhältnis, mit dem
      var(--fs-sm) selbst bereits ~87,5% von var(--fs-md) (Hauptnav) ist, siehe bereichsLeiste.js. */
      font-weight: 500; color: var(--text);
      background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
      cursor: pointer; white-space: nowrap; }
    .visualisierungs-tab:hover { border-color: var(--accent); }
    .visualisierungs-tab.ist-aktiv { border-color: var(--accent); background: var(--accent);
      color: var(--surface); font-weight: 600; }
    .visualisierungs-tab.ist-uebersicht { border-style: dashed; }
    .visualisierungs-tab.ist-uebersicht.ist-aktiv { border-style: solid; }
    .visualisierungs-tab:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    /* FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation", Punkt 2: Icon+Name-
       Kacheln statt reiner Text-Pillen (verankereIconFlyout()) - dieselbe
       Klick-/Rahmen-Optik wie .visualisierungs-tab, nur mit Platz für ein
       Icon links vom Namen. */
    .icon-flyout-liste { display: flex; flex-wrap: wrap; gap: var(--space-1); }
    .icon-flyout-eintrag { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 44px;
      padding: var(--space-2) var(--space-3); font-family: inherit; font-size: calc(var(--fs-sm) * 0.875);
      font-weight: 500; color: var(--text); background: var(--bg); border: 1px solid var(--border);
      border-radius: var(--radius); cursor: pointer; white-space: nowrap; }
    .icon-flyout-eintrag:hover { border-color: var(--accent); }
    .icon-flyout-eintrag:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .icon-flyout-icon { color: var(--text-muted); display: inline-flex; flex: none; }
    .icon-flyout-icon svg { width: 32px; height: 22px; }
  `;
  container.appendChild(style);
}

// Punkt 3: Tooltip-Inhalt aus Icon (vizIcons.js, gleiche Icons wie die
// Galerie-Kachel) + Name - als DOM-Knoten, siehe tooltip.js' Erweiterung.
function baueTooltipInhalt(tab) {
  const wrapper = document.createElement('span');
  wrapper.className = 'visualisierungs-tab-tooltip-inhalt';
  wrapper.appendChild(erzeugeVizIcon(tab.id));
  const text = document.createElement('span');
  text.textContent = tab.label;
  wrapper.appendChild(text);
  return wrapper;
}

// tabs: [{id, label, istUebersicht?}]. aktiverId: id des aktiven Tabs (oder
// null für "Übersicht"). onAktivieren(id): Klick-Callback.
function baueTabStreifen(tabs, aktiverId, onAktivieren) {
  const nav = document.createElement('div');
  nav.className = 'visualisierungs-tabs';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Visualisierungen');

  tabs.forEach((tab) => {
    const istAktiv = tab.id === aktiverId;
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = istAktiv ? 'visualisierungs-tab ist-aktiv' : 'visualisierungs-tab';
    if (tab.istUebersicht) knopf.classList.add('ist-uebersicht');
    knopf.setAttribute('role', 'tab');
    knopf.setAttribute('aria-selected', String(istAktiv));
    knopf.textContent = tab.label;
    knopf.addEventListener('click', () => onAktivieren(tab.id));

    if (!tab.istUebersicht) {
      knopf.addEventListener('mouseenter', () => zeigeTooltip(baueTooltipInhalt(tab), knopf));
      knopf.addEventListener('mouseleave', () => versteckeTooltip());
      knopf.addEventListener('focus', () => zeigeTooltip(baueTooltipInhalt(tab), knopf));
      knopf.addEventListener('blur', () => versteckeTooltip());
    }

    nav.appendChild(knopf);
  });

  return nav;
}

// eintraege: [{id, label}]. onAktivieren(id): Klick-Callback. Punkt 2: Icon
// (vizIcons.js) sichtbar NEBEN dem Namen statt nur im Hover-Tooltip wie bei
// baueTabStreifen() - deshalb kein separates Tooltip hier nötig, das Icon
// ist ja bereits direkt sichtbar.
function baueIconListe(eintraege, onAktivieren) {
  const liste = document.createElement('div');
  liste.className = 'icon-flyout-liste';
  liste.setAttribute('role', 'list');

  eintraege.forEach((eintrag) => {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'icon-flyout-eintrag';
    const icon = document.createElement('span');
    icon.className = 'icon-flyout-icon';
    icon.appendChild(erzeugeVizIcon(eintrag.id));
    const label = document.createElement('span');
    label.textContent = eintrag.label;
    knopf.append(icon, label);
    knopf.addEventListener('click', () => onAktivieren(eintrag.id));
    liste.appendChild(knopf);
  });

  return liste;
}

// FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation": gemeinsamer Kern aller
// vier Flyout-Varianten - baut Panel/Positionierung/Hover-Öffnen-Schließen/
// Resize-Neupositionierung, OHNE irgendeine Klick-Semantik am Auslöser
// festzulegen (das bleibt den vier spezifischen verankereXyz()-Funktionen
// unten überlassen, siehe Dateikopf-Kommentar für die Begründung der
// Aufteilung). `rendereInhalt(panel)` wird bei JEDEM Öffnen neu aufgerufen
// (frischer Inhalt statt zwischengespeichertem Zustand, wie schon in (44)).
//
// KORREKTURAUFTRAG "Vier unabhängige Korrekturen", Punkt 4: `schliesstBeiWegbewegen`
// (neuer Parameter, Default `false`) aktiviert NUR für die temporären
// Vorschau-Flyouts (verankereVorschauFlyout()/verankereIconFlyout() unten
// sowie app.js' "Visualisierungen"-Hauptnav-Flyout, die alle drei diesen
// Parameter explizit `true` setzen) ein zusätzliches, rein Hover-basiertes
// Schließen - der bereits bestehende Klick-Toggle-Zustand des AKTIVEN
// Bereichs/Bestands (verankereFlyout() unten, Nicht-Ziel laut Auftrag
// wörtlich) lässt den Parameter auf `false` und bleibt dadurch exakt beim
// bisherigen "bleibt bis Klick offen"-Verhalten aus (47)/(48) - dieselbe
// gemeinsame Kernfunktion bedient also weiterhin BEIDE Schließ-Philosophien,
// je nach Aufrufer.
//
// Warum nicht einfach ein simples mouseleave-schließt-Timer pro Instanz:
// die vier Flyout-Ebenen sind laut Baustein-Kommentar oben NICHT ineinander
// verschachtelt (jede eigene Instanz hängt ihr Panel direkt in <body>) -
// wandert die Maus von einem äußeren Auslöser/Panel in ein VERSCHACHTELTES
// Kind-Flyout (dessen eigener Auslöser zwar ein DOM-Nachfahre des äußeren
// Panels ist - siehe schliesseGeschwister()-Kommentar unten zur selben
// Containment-Prüfung -, dessen eigenes Panel aber NICHT), verlässt die Maus
// zwangsläufig kurzzeitig Auslöser UND Panel der äußeren Ebene. Ein naiver
// Timer würde die äußere Ebene deshalb schließen, obwohl der Nutzer gerade
// noch in der verschachtelten Kette unterwegs ist - dieselbe Fehlklasse, die
// bereits (47) für das alte, komplett entfernte mouseleave-Verhalten
// diagnostizierte. Lösung: `istPointerImBereichOderNachfahre()` (unten)
// prüft beim Ablauf der Karenzzeit zusätzlich rekursiv, ob eine OFFENE
// Kind-Instanz (deren Auslöser ein DOM-Nachfahre des eigenen Panels ist)
// gerade selbst noch gehalten wird - über `element.matches(':hover')`
// (native, synchrone Live-Abfrage des tatsächlichen Hover-Zustands, kein
// eigenes Positions-Tracking nötig). Schließt umgekehrt ein Kind (nachdem
// SEIN eigener Timer/Bereich-Check das entscheidet), benachrichtigt es über
// `benachrichtigeVorfahrenUeberSchliessen()` gezielt seine eigenen Vorfahren
// neu - ohne das würde ein Vorfahre, der sich beim EIGENEN Timer-Ablauf
// wegen eines damals noch offenen Kindes zum Offenbleiben entschied, nie
// wieder neu bewertet und bliebe offen, selbst nachdem der Nutzer die
// gesamte Kette längst verlassen hat.
const KARENZZEIT_MS = 120;

export function erzeugeFlyoutPanel(ausloeser, { klasse, rendereInhalt, schliesstBeiWegbewegen = false }) {
  let offen = false;
  let schliessTimer = null;

  const panel = document.createElement('div');
  panel.className = klasse;
  panel.hidden = true;
  document.body.appendChild(panel);

  ausloeser.setAttribute('aria-haspopup', 'true');
  ausloeser.setAttribute('aria-expanded', 'false');

  // Punkt 2 (Folgeauftrag "...einheitliche Positionierung..."): linke Kante
  // jetzt an der X-Position des AUSLÖSERS ausgerichtet (vorher: immer an
  // #app-content's linker Kante, unabhängig vom jeweiligen Auslöser) -
  // Positionsmessung statt fester Werte, aus demselben Grund wie
  // bereichsLeiste.js' synchronisiereXPosition() (Fensterbreite UND
  // Auslöser-Position sind beide variabel). max-width statt fester width:
  // das Panel soll nicht mehr zwingend die volle Content-Breite einnehmen,
  // aber auch nicht über die rechte Kante von #app-content hinausragen.
  function positioniere() {
    const inhaltRect = document.getElementById('app-content').getBoundingClientRect();
    const ausloeserRect = ausloeser.getBoundingClientRect();
    panel.style.left = `${ausloeserRect.left}px`;
    panel.style.maxWidth = `${Math.max(0, inhaltRect.right - ausloeserRect.left)}px`;
    panel.style.top = `${ausloeserRect.bottom + 4}px`;
  }

  // FOLGEAUFTRAG "Flyouts schließen sich nicht mehr gegenseitig - Stapel-Bug
  // beheben" (AKTUELLER STAND): schließt vor dem Öffnen jede ANDERE gerade
  // offene Instanz, die NICHT Vorfahre dieser hier ist (d.h. deren Panel
  // diesen Auslöser NICHT enthält) - genau die Umkehrung der Prüfung, die
  // schon den Chain-Erhalt in oeffne() selbst regelt: eine Instanz IST
  // Vorfahre, wenn ihr Panel den eigenen `ausloeser` als DOM-Nachfahren
  // enthält (das trifft z.B. auf eine verschachtelte Kette wie
  // "Visualisierungen" → "Bürgerbuch" zu, da Bürgerbuch's Pille als Teil des
  // von "Visualisierungen" gerenderten Vorschau-Inhalts direkt in dessen
  // Panel steckt) - alle anderen offenen Instanzen sind per Definition
  // GESCHWISTER (nicht verwandt) und werden geschlossen. Selbst-Vergleich
  // über `andere.panel === panel` statt über eine Referenz auf `kern`
  // (dieses Objekt existiert an dieser Stelle im Code noch nicht, siehe
  // dessen Definition weiter unten - jede Instanz hat aber ohnehin ein
  // eindeutiges eigenes <div>, das genügt als Identität).
  //
  // BEWUSST direkt in oeffne() selbst (nicht in einer separaten Funktion
  // pro Variante) - dieselbe EINE Öffnen-Funktion bedient dadurch sowohl
  // Hover- als auch Klick-ausgelöstes Öffnen (verankereFlyout()s Toggle
  // ruft ebenfalls kern.oeffne() auf) einheitlich, wie schon Punkt 2 des
  // vorigen Folgeauftrags aus demselben Grund keine zweite, parallele
  // Positionierungslogik brauchte.
  function schliesseGeschwister() {
    FLYOUT_INSTANZEN.forEach((andere) => {
      if (andere.panel === panel) return; // sich selbst überspringen
      if (!andere.istOffen()) return;
      if (andere.panel.contains(ausloeser)) return; // Vorfahre in der Kette - offen lassen
      andere.schliesse();
    });
  }

  function oeffne() {
    if (offen) return;
    schliesseGeschwister();
    offen = true;
    rendereInhalt(panel);
    positioniere();
    panel.hidden = false;
    ausloeser.setAttribute('aria-expanded', 'true');
  }

  function brichSchliessenAb() {
    if (schliessTimer) { clearTimeout(schliessTimer); schliessTimer = null; }
  }

  // Rekursive Prüfung (siehe Kommentar zu `schliesstBeiWegbewegen` oben):
  // true, solange der Zeiger noch über dem eigenen Auslöser/Panel steht,
  // ODER eine noch offene, DOM-nachfahrende Kind-Instanz selbst noch
  // gehalten wird.
  function istPointerImBereichOderNachfahre() {
    if (ausloeser.matches(':hover') || panel.matches(':hover')) return true;
    for (const andere of FLYOUT_INSTANZEN) {
      if (andere.panel === panel) continue;
      if (!andere.istOffen()) continue;
      if (panel.contains(andere.ausloeser) && andere.istPointerImBereichOderNachfahre()) return true;
    }
    return false;
  }

  // Nach der Karenzzeit (KARENZZEIT_MS) erneut prüfen statt sofort zu
  // schließen - vermeidet Flackern beim Überqueren kleiner Lücken zwischen
  // Auslöser und Panel (Auftrag wörtlich) UND gibt einer evtl. gerade erst
  // betretenen Kind-Instanz genug Zeit, sich selbst als "offen" bei
  // `FLYOUT_INSTANZEN` einzutragen.
  function planeSchliessenFallsNoetig() {
    if (!schliesstBeiWegbewegen) return;
    brichSchliessenAb();
    schliessTimer = setTimeout(() => {
      schliessTimer = null;
      if (!istPointerImBereichOderNachfahre()) schliesse();
    }, KARENZZEIT_MS);
  }

  // Benachrichtigt eigene VORFAHREN (deren Panel den eigenen Auslöser
  // enthält), wenn diese Instanz gerade geschlossen hat - ohne das bliebe
  // ein Vorfahre, der beim eigenen Timer-Ablauf wegen dieser (damals noch
  // offenen) Kind-Instanz offen blieb, für immer offen, selbst nachdem der
  // Nutzer die gesamte Kette verlassen hat.
  function benachrichtigeVorfahrenUeberSchliessen() {
    FLYOUT_INSTANZEN.forEach((andere) => {
      if (andere.panel === panel) return;
      if (!andere.istOffen()) return;
      if (andere.panel.contains(ausloeser)) andere.planeSchliessenFallsNoetig();
    });
  }

  function schliesse() {
    if (!offen) return;
    brichSchliessenAb();
    offen = false;
    panel.hidden = true;
    ausloeser.setAttribute('aria-expanded', 'false');
    benachrichtigeVorfahrenUeberSchliessen();
  }

  // Punkt 1 (Folgeauftrag "Flyout-Kette bleibt offen bis Klick..."): Hover
  // ÖFFNET weiterhin. Schließen übernimmt für den PERMANENTEN Klick-Zustand
  // (`schliesstBeiWegbewegen === false`, Nicht-Ziel) unverändert nur a) die
  // bestehenden Eintrag-Klick-Handler, b) der globale Klick-außerhalb-
  // Listener oder c) schliesseGeschwister() oben. Für die TEMPORÄREN
  // Vorschau-Flyouts (`schliesstBeiWegbewegen === true`, KORREKTURAUFTRAG
  // "Vier unabhängige Korrekturen", Punkt 4) kommt zusätzlich d) das
  // Verlassen von Auslöser UND Panel (nach Karenzzeit, s.o.) hinzu.
  function beiAusloeserBetreten() { brichSchliessenAb(); oeffne(); }
  ausloeser.addEventListener('mouseenter', beiAusloeserBetreten);
  ausloeser.addEventListener('mouseleave', planeSchliessenFallsNoetig);
  panel.addEventListener('mouseenter', brichSchliessenAb);
  panel.addEventListener('mouseleave', planeSchliessenFallsNoetig);

  // Repositionieren bei Fenstergröße-Änderung, aber nur während der Flyout
  // tatsächlich offen ist (reine Positionsanpassung, kein Neuaufbau - anders
  // als bereichsLeiste.js' eigene resize-Behandlung braucht das keinen
  // Debounce, da nur style-Werte geschrieben werden, kein Redraw).
  function beiResize() {
    if (offen) positioniere();
  }
  window.addEventListener('resize', beiResize);

  const kern = {
    panel,
    ausloeser,
    istOffen: () => offen,
    oeffne,
    schliesse,
    // Von `benachrichtigeVorfahrenUeberSchliessen()`/`istPointerImBereichOderNachfahre()`
    // ANDERER Instanzen aufgerufen (siehe Kommentar zu `schliesstBeiWegbewegen`
    // oben) - für Instanzen mit `schliesstBeiWegbewegen === false` (der
    // permanente Klick-Zustand) ein bewusstes No-Op (planeSchliessenFallsNoetig()
    // selbst prüft das bereits als erstes).
    planeSchliessenFallsNoetig,
    istPointerImBereichOderNachfahre,
    neuRendernFallsOffen() {
      if (offen) rendereInhalt(panel);
    },
    destroy() {
      window.removeEventListener('resize', beiResize);
      brichSchliessenAb();
      ausloeser.removeEventListener('mouseenter', beiAusloeserBetreten);
      ausloeser.removeEventListener('mouseleave', planeSchliessenFallsNoetig);
      panel.removeEventListener('mouseenter', brichSchliessenAb);
      panel.removeEventListener('mouseleave', planeSchliessenFallsNoetig);
      ausloeser.removeAttribute('aria-haspopup');
      ausloeser.removeAttribute('aria-expanded');
      versteckeTooltip();
      panel.remove();
      FLYOUT_INSTANZEN.delete(kern);
    }
  };

  FLYOUT_INSTANZEN.add(kern);
  stelleGlobalenKlickListenerSicher();

  return kern;
}

// options.tabs/aktiverId/onAktivieren: siehe baueTabStreifen() oben. Klick
// auf den Auslöser TOGGLET den Flyout - für den jeweils AKTIVEN Bereichs-/
// Bestand-Kontext (siehe Dateikopf-Kommentar), dessen aktiverId sich per
// .aktualisiere() live mitändert.
export function verankereFlyout(ausloeser, initialOptionen) {
  let optionen = initialOptionen;
  const kern = erzeugeFlyoutPanel(ausloeser, {
    klasse: 'visualisierungs-tabs-flyout',
    rendereInhalt: (panel) => {
      panel.innerHTML = '';
      fuegeFlyoutStyleEin(panel);
      panel.appendChild(baueTabStreifen(optionen.tabs, optionen.aktiverId, (id) => {
        optionen.onAktivieren(id);
        kern.schliesse(); // UX-Entscheidung siehe Dateikopf-Kommentar
      }));
    }
  });

  function beiKlick(event) {
    event.preventDefault(); // verhindert z.B. bereichsLeiste.js' eigenen Klick-Handler / einen echten Anker-Sprung
    if (kern.istOffen()) kern.schliesse(); else kern.oeffne();
  }
  ausloeser.addEventListener('click', beiKlick);

  return {
    // app.js ruft dies bei jedem Tab-Wechsel auf, um Tab-Liste/aktive ID
    // aktuell zu halten, ohne die Hover/Klick-Verdrahtung neu aufzubauen.
    aktualisiere(neueOptionen) {
      optionen = { ...optionen, ...neueOptionen };
      kern.neuRendernFallsOffen();
    },
    destroy() {
      ausloeser.removeEventListener('click', beiKlick);
      kern.destroy();
    }
  };
}

// FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation", Punkt 3 (+ Baustein
// für Punkt 1s verschachtelten Bereichs-Tab-Flyout): reiner Hover-Flyout OHNE
// eigene Klick-Verdrahtung am Auslöser - siehe Dateikopf-Kommentar für die
// Begründung. `tabs`/`onAktivieren` wie bei verankereFlyout(), aber ohne
// `aktiverId` (der Auslöser ist hier nie der GERADE aktive Bereich - sonst
// käme ohnehin verankereFlyout() zum Einsatz, siehe bereichsLeiste.js).
export function verankereVorschauFlyout(ausloeser, { tabs, onAktivieren }) {
  const kern = erzeugeFlyoutPanel(ausloeser, {
    klasse: 'visualisierungs-tabs-flyout',
    // KORREKTURAUFTRAG "Vier unabhängige Korrekturen", Punkt 4: temporärer
    // Vorschau-Flyout - schließt zusätzlich per Hover-Wegbewegen (s. o.).
    schliesstBeiWegbewegen: true,
    rendereInhalt: (panel) => {
      panel.innerHTML = '';
      fuegeFlyoutStyleEin(panel);
      panel.appendChild(baueTabStreifen(tabs, null, (id) => {
        onAktivieren(id);
        kern.schliesse();
      }));
    }
  });
  return kern;
}

// FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation", Punkt 2: Icon+Name-
// Kacheln (baueIconListe()) statt Text-Pillen. Klick auf den Auslöser
// SCHLIESST den Flyout, verhindert aber NICHT dessen Standard-Aktion (der
// Auslöser ist ein echter Anker, dessen normale Navigation weiterlaufen
// soll - siehe Dateikopf-Kommentar).
export function verankereIconFlyout(ausloeser, { eintraege, onAktivieren }) {
  const kern = erzeugeFlyoutPanel(ausloeser, {
    klasse: 'visualisierungs-tabs-flyout',
    // KORREKTURAUFTRAG "Vier unabhängige Korrekturen", Punkt 4: temporärer
    // Vorschau-Flyout - schließt zusätzlich per Hover-Wegbewegen (s. o.).
    schliesstBeiWegbewegen: true,
    rendereInhalt: (panel) => {
      panel.innerHTML = '';
      fuegeFlyoutStyleEin(panel);
      panel.appendChild(baueIconListe(eintraege, (id) => {
        onAktivieren(id);
        kern.schliesse();
      }));
    }
  });

  function beiKlick() {
    kern.schliesse(); // bewusst KEIN preventDefault(), siehe Dateikopf-Kommentar
  }
  ausloeser.addEventListener('click', beiKlick);

  return {
    destroy() {
      ausloeser.removeEventListener('click', beiKlick);
      kern.destroy();
    }
  };
}
