// js/utils/filterleiste.js
// Geteiltes, konfigurierbares Filterleisten-Modul (Suchschlitz + Kategorie-
// Dropdown), Grundstein für spätere Wiederverwendung durch weitere Urkunden-
// Visualisierungen (z. B. zeitachse.js) - siehe Auftrag "Suchschlitz +
// Kategoriefilter im Regesten-Kachelraster".
//
// Baustein-Muster wie js/core/ansichtWechseln.js/unsicherheitsButton.js (NICHT
// das Singleton-Muster von tooltip.js/lightbox.js): jeder Aufruf von
// erzeugeFilterleiste() erzeugt eine eigene, unabhängige Instanz mit eigenem,
// nur in dieser Closure lebendem Zustand. Das ist hier bewusst so und kein
// Zufallstreffer - der Auftrag verlangt ausdrücklich "kein geteilter
// Filter-Zustand zwischen verschiedenen Urkunden-Modulen" (Nicht-Ziel); ein
// modul-weiter Singleton wie bei tooltip.js/lightbox.js (ein einziges,
// wiederverwendetes DOM-Element für die ganze Seite) würde genau das
// verletzen, sobald zwei Module gleichzeitig eine eigene Filterleiste zeigen.
//
// Weiß selbst nichts über "Urkunde"/"Regest"/"Kategorie" im fachlichen Sinn -
// Placeholder-Text und die Liste der Kategorie-Optionen kommen komplett von
// außen (config), damit dieses Modul unverändert von jeder künftigen
// Visualisierung mit anderen Feldnamen/Kategorien genutzt werden kann.

const ALLE_KATEGORIEN_WERT = '';

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .filterleiste { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-2); }
    .filterleiste label { display: flex; align-items: center; gap: var(--space-1); font-size: var(--fs-sm); }
    .filterleiste input[type="search"], .filterleiste select { min-height: 44px; font: inherit; padding: 4px 8px; }
    /* Bugfix: 260px schnitt den vollständigen Placeholder-Text ab (endete bei
       "Orten, F..."). 440px ist die tatsächlich per canvas.measureText()
       gemessene Breite des längsten Placeholder-Texts (~402px bei 14px/Inter)
       plus Sicherheitsspanne für andere Systemschriften/Zoomstufen, bei denen
       Zeichenbreiten leicht abweichen können. Das Suchlabel darf zusätzlich
       wachsen (flex-grow), falls mehr Platz verfügbar ist - das Kategorie-Feld
       bleibt dabei bewusst auf seiner Eigenbreite (flex-grow: 0), damit nur
       das Suchfeld zusätzlichen Platz beansprucht, nicht auch das Dropdown. */
    .filterleiste input[type="search"] { min-width: 440px; }
    .filterleiste-suche-label { flex: 1 1 440px; }
    .filterleiste-suche-label input[type="search"] { width: 100%; }
    .filterleiste-kategorie-label { flex: 0 0 auto; }
  `;
  container.appendChild(style);
}

// suchbegriff kommt bereits getrimmt (nicht mehr klein geschrieben - das
// case-insensitive Matching selbst ist Sache des Aufrufers, dieses Modul kennt
// die zu durchsuchenden Felder ja gar nicht).
function ermittleZustand(sucheInput, kategorieSelect) {
  return { suchbegriff: sucheInput.value.trim(), kategorie: kategorieSelect.value };
}

// bilder: siehe lightbox.js-Vorbild für den Kommentierungsstil - hier:
// kategorien: Array von Kategorie-Strings (bereits die vollständige Werteliste,
// z. B. Object.keys(CAT_COLORS) ohne die technischen Fallback-Schlüssel), wird
// von diesem Modul selbst alphabetisch sortiert und um "Alle Kategorien" als
// Default-Option ergänzt (Auftrag, Punkt 2, wörtlich).
export function erzeugeFilterleiste(container, {
  suchPlaceholder = 'Suchen …',
  kategorien = [],
  onChange,
  debounceMs = 250
} = {}) {
  container.innerHTML = '';
  fuegeStyleEin(container);

  const wrapper = document.createElement('div');
  wrapper.className = 'filterleiste';

  const sucheLabel = document.createElement('label');
  sucheLabel.className = 'filterleiste-suche-label';
  sucheLabel.appendChild(document.createTextNode('Suche: '));
  const sucheInput = document.createElement('input');
  sucheInput.type = 'search';
  sucheInput.placeholder = suchPlaceholder;
  sucheLabel.appendChild(sucheInput);

  const kategorieLabel = document.createElement('label');
  kategorieLabel.className = 'filterleiste-kategorie-label';
  kategorieLabel.appendChild(document.createTextNode('Kategorie: '));
  const kategorieSelect = document.createElement('select');
  kategorieSelect.setAttribute('aria-label', 'Nach Kategorie filtern');

  const alleOption = document.createElement('option');
  alleOption.value = ALLE_KATEGORIEN_WERT;
  alleOption.textContent = 'Alle Kategorien';
  kategorieSelect.appendChild(alleOption);

  [...kategorien].sort((a, b) => a.localeCompare(b, 'de')).forEach((kategorie) => {
    const option = document.createElement('option');
    option.value = kategorie;
    option.textContent = kategorie;
    kategorieSelect.appendChild(option);
  });
  kategorieLabel.appendChild(kategorieSelect);

  wrapper.append(sucheLabel, kategorieLabel);
  container.appendChild(wrapper);

  // Punkt 1 (Auftrag): "Debounce ~200-300ms, um nicht bei jedem Tastendruck neu
  // zu rendern" - gilt NUR fürs Suchfeld (Freitext-Eingabe, viele Ereignisse
  // pro Sekunde möglich). Die Kategorie-Auswahl ist ein diskretes
  // change-Ereignis (ein Klick = eine Auswahl) und meldet daher sofort, ohne
  // auf einen ggf. noch laufenden Such-Debounce zu warten oder selbst
  // verzögert zu wirken.
  let debounceTimer = null;
  function meldeAenderung() {
    if (onChange) onChange(ermittleZustand(sucheInput, kategorieSelect));
  }

  sucheInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(meldeAenderung, debounceMs);
  });
  kategorieSelect.addEventListener('change', () => {
    clearTimeout(debounceTimer);
    meldeAenderung();
  });

  return {
    getZustand() {
      return ermittleZustand(sucheInput, kategorieSelect);
    },
    // Auftrag "Kalender-Legende zurück, Sidebar-Navigation isolieren,
    // Expand-Umrandung", Punkt 3: programmatisches Setzen des Suchbegriffs
    // ("so als hätte man sie eingetippt") für Aufrufer, die eine Signatur
    // von außen vorgeben wollen (aktuell: regestenKachelraster.js' Sidebar-
    // Klick-Navigation, siehe dortiger Kommentar). Meldet sofort (kein
    // Debounce) - das ist keine Tastatureingabe mit vielen Ereignissen pro
    // Sekunde, sondern ein einzelner, gezielter Aufruf, der ohne sichtbare
    // Verzögerung wirken soll.
    setzeSuchbegriff(wert) {
      clearTimeout(debounceTimer);
      sucheInput.value = wert;
      meldeAenderung();
    },
    destroy() {
      clearTimeout(debounceTimer);
      container.innerHTML = '';
    }
  };
}
