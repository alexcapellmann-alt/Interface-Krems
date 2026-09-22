// js/utils/fotoOrdner.js
// Löst foto_ordner (Spalte in urkunden.csv, siehe SCHEMA.md) zu einer Liste
// tatsächlich vorhandener Bild-URLs unter fotos/thumbs/<foto_ordner>/ auf.
//
// Quelle: data/foto_manifest.json (Masterprompt Abschnitt 3, v4.2) - einmalig generiert
// über scripts/erzeugeFotoManifest.js, erneut ausführen wenn neue Fotos hinzukommen.
// Kein Live-Verzeichnislisting mehr (frühere Version, siehe docs/PROJEKTLOG.md):
// funktionierte nur mit Servern, die eine HTML-Verzeichnisliste ausliefern (z.B.
// Apache/nginx-Autoindex, `python -m http.server`), nicht mit verbreiteten
// Static-Hostern wie GitHub Pages.

let manifestPromise = null;

// Wird nur beim ersten Aufruf tatsächlich geladen, danach aus dem Modul-Cache bedient -
// vermeidet 1068 einzelne Fetches derselben Datei.
function ladeManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch('data/foto_manifest.json')
      .then((antwort) => (antwort.ok ? antwort.json() : {}))
      .catch(() => ({}));
  }
  return manifestPromise;
}

export async function ladeFotos(fotoOrdner) {
  if (!fotoOrdner) return [];

  const manifest = await ladeManifest();
  const dateien = manifest[fotoOrdner];
  if (!dateien || dateien.length === 0) return [];

  return dateien.map((datei) => `fotos/thumbs/${fotoOrdner}/${datei}`);
}
