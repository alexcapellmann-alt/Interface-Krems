// js/utils/infoButton.js
// Geteilter Info-Button mit Erklär-Popover (Auftrag "Geteilter Info-Button
// mit Erklär-Popover") - ersetzt modul-eigene, fest einprogrammierte
// Bedienhinweistexte (z.B. zeitachse.js' vormaliges "Scrollen = Zoom ·
// Ziehen = Verschieben") durch einen einheitlichen, überall gleich
// aussehenden und gleich positionierten Baustein. Kennt selbst NICHTS über
// ein bestimmtes Modul - der komplette Erklärtext kommt als Konfiguration
// von außen (siehe erzeugeInfoButton()).
//
// Baustein-Muster wie js/core/ansichtWechseln.js/unsicherheitsButton.js UND
// wie das im selben Projekt bereits etablierte Kategorie-Menü in
// zeitachse.js/die Filterleiste in regestenKachelraster.js (Klick auf
// Trigger öffnet ein Panel direkt daneben, schließt bei Klick außerhalb
// oder Escape, eigene document-Listener werden EINMAL bei der Erzeugung
// registriert und in destroy() wieder entfernt) - bewusst NICHT das
// Singleton-Muster von tooltip.js/lightbox.js: jedes Modul braucht seinen
// EIGENEN Info-Button mit eigenem Text, nicht einen einzigen, seitenweit
// geteilten.

let laufendeId = 0;

function fuegeStyleEinmaligEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .info-button-wrapper { position: relative; flex: 0 0 auto; }
    .info-button { min-width: 32px; min-height: 32px; width: 32px; height: 32px; border-radius: 50%;
      border: none; background: var(--accent); color: #fff; font: inherit; font-weight: 700; font-size: 1rem;
      line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
    .info-button:hover { filter: brightness(1.1); }
    .info-button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .info-button-popover { position: absolute; top: calc(100% + var(--space-2)); right: 0; z-index: 30;
      width: max-content; max-width: min(360px, 90vw); max-height: min(420px, 70vh); overflow-y: auto;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      box-shadow: var(--shadow); padding: var(--space-3); font-size: var(--fs-sm); color: var(--text); }
    .info-button-popover:focus { outline: none; }
    .info-button-popover p { margin: 0 0 var(--space-2) 0; }
    .info-button-popover p:last-child { margin-bottom: 0; }
  `;
  container.appendChild(style);
}

// container: das Element, in das Button+Popover eingehängt werden - muss
// selbst keine eigene Positionierung mitbringen (.info-button-wrapper ist
// bereits position:relative, das Popover positioniert sich relativ dazu).
// Aufrufer ist dafür verantwortlich, container an der gewünschten Stelle
// (Auftrag: oben rechts im jeweiligen Werkzeugleisten-Bereich) einzuhängen.
//
// text: der Erklärtext, durch LEERZEILEN (\n\n) getrennt in einzelne
// <p>-Absätze aufgeteilt (Auftrag: "Text darf mehrere Absätze... sein").
//
// zusatzInhalt (optional, Auftrag "Habsburg-Zeitleistenbaum – Größe,
// Zoom-Granularität, Verbindungs-Hervorhebung, Legende"): beliebiger,
// bereits fertig gebauter DOM-Node, der NACH den Text-Absätzen ins Popover
// gehängt wird - für Inhalte, die reiner Text nicht abbilden kann (z.B.
// eine Farblegende mit echten Swatch-Elementen). Rückwärtskompatibel: ohne
// diesen Parameter (weiterhin `undefined`) verhält sich die Funktion exakt
// wie zuvor, alle bisherigen Aufrufer (zeitachse.js etc.) unverändert.
export function erzeugeInfoButton(container, { text, ariaLabel = 'Erklärung zu dieser Visualisierung', zusatzInhalt } = {}) {
  laufendeId += 1;
  const popoverId = `info-popover-${laufendeId}`;

  fuegeStyleEinmaligEin(container);

  const wrapper = document.createElement('div');
  wrapper.className = 'info-button-wrapper';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'info-button';
  btn.textContent = '?';
  btn.setAttribute('aria-label', ariaLabel);
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-describedby', popoverId);

  const popover = document.createElement('div');
  popover.id = popoverId;
  popover.className = 'info-button-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', ariaLabel);
  popover.setAttribute('tabindex', '-1');
  popover.hidden = true;
  (text || '').split('\n\n').forEach((absatz) => {
    const p = document.createElement('p');
    p.textContent = absatz;
    popover.appendChild(p);
  });
  if (zusatzInhalt) popover.appendChild(zusatzInhalt);

  let offen = false;
  function setzeOffen(neu) {
    if (offen === neu) return;
    offen = neu;
    popover.hidden = !offen;
    btn.setAttribute('aria-expanded', String(offen));
    if (offen) {
      // Fokus wandert in den Popover-Inhalt (kein eigener Schließen-Button
      // vorhanden, siehe Dateikopf-Kommentar zu den drei Schließen-Wegen) -
      // tabindex="-1" macht das reine Inhalts-<div> gezielt fokussierbar.
      popover.focus();
    } else {
      // Fokus kehrt zum Button zurück - analog zur bestehenden
      // Lightbox-Konvention (js/utils/lightbox.js).
      btn.focus();
    }
  }

  // stopPropagation(): derselbe, bereits an zeitachse.js' Kategorie-Menü
  // erprobte Kniff (siehe dortiger Kommentar in baueKategorieFilter()) -
  // ohne ihn würde derselbe Klick, der das Popover gerade öffnet, sofort
  // im Anschluss auch den document-weiten Außerhalb-Klick-Listener
  // erreichen und es wieder schließen.
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    setzeOffen(!offen);
  });

  function handleDocumentClick(event) {
    if (!offen) return;
    if (!wrapper.contains(event.target)) setzeOffen(false);
  }
  function handleDocumentKeydown(event) {
    if (!offen) return;
    if (event.key === 'Escape') setzeOffen(false);
  }
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);

  wrapper.append(btn, popover);
  container.appendChild(wrapper);

  return {
    destroy() {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleDocumentKeydown);
      wrapper.remove();
    }
  };
}
