// scripts/erzeugeFotoManifest.js
// Einmaliger Vorbereitungsschritt, KEIN Teil der Laufzeit-Anwendung (Masterprompt
// Abschnitt 3, v4.2: vergleichbar mit dem Excel-zu-CSV-Export, kein Verstoß gegen
// "kein Build-Step" - der Grundsatz betrifft die Laufzeit-Anwendung, nicht die
// einmalige Datenvorbereitung).
//
// Durchsucht fotos/thumbs/ und schreibt data/foto_manifest.json:
//   { "<foto_ordner-Name>": ["datei1.jpg", "datei2.jpg", ...], ... }
// Leere Ordner werden mit [] aufgenommen (nicht weggelassen), damit fotoOrdner.js
// zuverlässig zwischen "Ordner nie geprüft" und "Ordner geprüft, aber leer" unterscheiden
// kann.
//
// Erneut ausführen, wenn neue Fotos hinzukommen:
//   node scripts/erzeugeFotoManifest.js

const fs = require('fs');
const path = require('path');

const THUMBS_ORDNER = path.join(__dirname, '..', 'fotos', 'thumbs');
const ZIEL_DATEI = path.join(__dirname, '..', 'data', 'foto_manifest.json');
const BILD_ENDUNGEN = /\.(jpe?g|png|webp|tiff?|gif)$/i;

function erzeugeManifest() {
  const manifest = {};
  const ordnerListe = fs.readdirSync(THUMBS_ORDNER, { withFileTypes: true })
    .filter((eintrag) => eintrag.isDirectory());

  for (const ordner of ordnerListe) {
    const ordnerPfad = path.join(THUMBS_ORDNER, ordner.name);
    const dateien = fs.readdirSync(ordnerPfad)
      .filter((datei) => BILD_ENDUNGEN.test(datei))
      .sort();
    manifest[ordner.name] = dateien;
  }

  fs.writeFileSync(ZIEL_DATEI, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Manifest geschrieben: ${ZIEL_DATEI} (${ordnerListe.length} Ordner)`);
}

erzeugeManifest();
