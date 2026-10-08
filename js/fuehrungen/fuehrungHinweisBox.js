// js/fuehrungen/fuehrungHinweisBox.js
// AUFTRAG D, Punkt 4: gemeinsame Box für Prüfhinweise in den Führungen.
// Der Vorsatz „Fehler:“ bzw. „Hinweis:“ (fehlende/leere optionale Quelle,
// AUFTRAG C3) steht jetzt im Seitentext - vorher kam er per CSS (`::before`)
// und wurde von Hilfsmitteln nicht zuverlässig vorgelesen. Optik unverändert:
// derselbe Vorsatz, fett, in der Farbe der Box.
//
// quelleFehlt: true = Hinweis auf eine bewusst optionale, fehlende/leere Quelle.
// zusatzKlasse: weitere Klasse für die Box (z. B. Galerie-Hinweis).
export function baueFuehrungHinweisBox(text, { quelleFehlt = false, zusatzKlasse = '' } = {}) {
  const box = document.createElement('p');
  box.className = ['fuehrung-fehler', quelleFehlt ? 'fuehrung-quelle-fehlt' : '', zusatzKlasse].filter(Boolean).join(' ');
  const vorsatz = document.createElement('strong');
  vorsatz.className = 'fuehrung-vorsatz';
  vorsatz.textContent = quelleFehlt ? 'Hinweis: ' : 'Fehler: ';
  box.append(vorsatz, document.createTextNode(text));
  return box;
}
