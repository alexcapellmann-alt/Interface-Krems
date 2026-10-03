// js/utils/hinweisBalken.js
// AUFTRAG B2 (Prüfbericht Punkt 3): EINE gemeinsame Stelle, um Probleme mit
// den Datendateien sichtbar zu machen (fehlende Datei, keine Datensätze,
// fehlende Pflichtspalte, vermutlich falsches Trennzeichen) - in einfacher
// Sprache, oben in der betroffenen Ansicht.
//
// Barrierefreiheit: Rolle "status" (höfliche Live-Region, unterbricht nicht);
// das Problem ist nicht nur an der Farbe erkennbar (Symbol "!" und das Wort
// "Hinweis"); nicht fokussierbar und ohne Bedienelemente, steht also bei der
// Tastaturbedienung nicht im Weg. Text ausschließlich über textContent (kein
// innerHTML - Dateinamen/Spaltennamen stammen aus den CSV-Dateien).
// Farben/Kontrast: siehe .hinweis-balken in css/components.css.

// texte: Liste von Sätzen; jeder Satz wird ein eigener Absatz.
export function erzeugeHinweisBalken(texte) {
  const balken = document.createElement('div');
  balken.className = 'hinweis-balken';
  balken.setAttribute('role', 'status');

  const symbol = document.createElement('span');
  symbol.className = 'hinweis-balken-symbol';
  symbol.setAttribute('aria-hidden', 'true');
  symbol.textContent = '!';

  const inhalt = document.createElement('div');
  inhalt.className = 'hinweis-balken-text';
  const titel = document.createElement('p');
  titel.className = 'hinweis-balken-titel';
  titel.textContent = 'Hinweis zu den Daten';
  inhalt.appendChild(titel);
  texte.forEach((text) => {
    const absatz = document.createElement('p');
    absatz.textContent = text;
    inhalt.appendChild(absatz);
  });

  balken.append(symbol, inhalt);
  return balken;
}
