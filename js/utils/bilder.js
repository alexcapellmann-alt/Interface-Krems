// js/utils/bilder.js
// AUFTRAG "Urkundenfotos über die Spalte `bilder`": löst den bisherigen,
// separaten JSON-Datei-basierten Foto-Helfer ab. Die Dateinamen stehen jetzt
// direkt in der jeweiligen Tabelle (aktuell nur urkunden.csv, siehe
// SCHEMA.md) - keine externe Zwischendatei, kein Kommandozeilen-Skript mehr
// nötig, um neue Fotos sichtbar zu machen (Archivar:innen tragen sie direkt
// in die CSV-Zelle ein).
//
// Bewusst allgemein gehalten (Nicht-Ziel-Vorgabe: "später für jede Tabelle
// mit foto_ordner und bilder"): kennt nur die beiden Feldnamen `foto_ordner`/
// `bilder`, nichts Urkunden-Spezifisches.
//
// dataLoader.js wandelt eine Zelle nur dann in eine Liste um, wenn sie ein
// `|` enthält (siehe dortiger Dateikopf-Kommentar) - eine Zelle mit genau
// einem Dateinamen kommt daher als einfache Zeichenkette an, eine mit
// mehreren als Array, eine leere Zelle als leerer String. ermittleBildUrls()
// behandelt alle drei Fälle gleich.

const THUMBS_BASIS = 'fotos/thumbs';

// Baut die Liste der Bildpfade aus einem Record mit `foto_ordner`/`bilder`-
// Feldern - rein synchron, kein Netzwerkzugriff (die Dateinamen stehen
// bereits in der CSV, es muss nichts mehr nachgeladen werden).
export function ermittleBildUrls(record) {
  const ordnerName = record?.foto_ordner;
  if (!ordnerName) return [];

  const roh = record?.bilder;
  const liste = Array.isArray(roh) ? roh : (roh ? [roh] : []);

  return liste
    .map((datei) => datei.trim())
    .filter((datei) => datei !== '')
    .map((datei) => `${THUMBS_BASIS}/${ordnerName}/${datei}`);
}

// Verdrahtet die Fehlerbehandlung für EIN bereits erzeugtes <img>-Element:
// lädt die Datei nicht (Tippfehler in der `bilder`-Zelle, Datei fehlt), wird
// das <img> durch einen sichtbaren, zurückhaltenden Text-Hinweis ersetzt
// (nie eine leere Fläche/ein kaputtes Bildsymbol) und eine console.warn mit
// Signatur+Dateiname ausgegeben. `{ once: true }`, da ein einzelnes
// `error`-Ereignis pro <img> genügt (kein erneuter Ladeversuch vorgesehen).
export function wendeBildFehlerbehandlungAn(img, url, signatur) {
  img.addEventListener('error', () => {
    const dateiname = url.split('/').pop();
    console.warn(`Bild nicht gefunden: ${dateiname}${signatur ? ` (Urkunde ${signatur})` : ''}`);
    const hinweis = document.createElement('span');
    hinweis.textContent = `Bild nicht gefunden: ${dateiname}`;
    hinweis.style.cssText = 'display:inline-block; font-style:italic; color:var(--text-muted); font-size:var(--fs-sm); padding:4px;';
    img.replaceWith(hinweis);
  }, { once: true });
}
