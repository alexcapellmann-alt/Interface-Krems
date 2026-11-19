// js/utils/jahrgaenge.js
// Auftrag 17: Spalte `fehlende_jahrgaenge` des Bestandsverzeichnisses (Auftrag 12) in Intervalle zerlegen und für die
// Anzeige beschreiben. Schreibweise: Einzeljahre und Spannen, durch `|` getrennt (z. B. `1519-1526|1656-1662|1786`). Der
// DataLoader liefert Pipe-Listen bereits als Array; beides wird angenommen. Nicht lesbare Teile werden übersprungen und
// gezählt (für die Datenprüfung), nichts wird erfunden.

const TEIL = /^(\d{3,4})(?:\s*[-–]\s*(\d{3,4}))?$/;

// -> { intervalle: [[von, bis], …] (aufsteigend), ungueltig: [roher Teil, …] }
export function zerlegeJahrgaenge(wert) {
  const teile = (Array.isArray(wert) ? wert : String(wert ?? '').split('|')).map((t) => String(t).trim()).filter(Boolean);
  const intervalle = [];
  const ungueltig = [];
  for (const teil of teile) {
    const m = TEIL.exec(teil);
    if (!m) { ungueltig.push(teil); continue; }
    const von = Number(m[1]);
    const bis = Number(m[2] ?? m[1]);
    if (bis < von) { ungueltig.push(teil); continue; }
    intervalle.push([von, bis]);
  }
  intervalle.sort((a, b) => a[0] - b[0]);
  return { intervalle, ungueltig };
}

export const anzahlJahrgaenge = (intervalle) => intervalle.reduce((n, [von, bis]) => n + bis - von + 1, 0);

// „1519–1526, 1620, 1650–1670“
export const jahreAlsText = (intervalle) => intervalle.map(([von, bis]) => (von === bis ? `${von}` : `${von}–${bis}`)).join(', ');

// Intervalle, die außerhalb der Laufzeit liegen (ganz oder teilweise)
export const ausserhalbDerLaufzeit = (intervalle, von, bis) => intervalle.filter(([a, b]) => a < von || b > bis);

// Auftrag 18: Die Laufzeit ist die überlieferte Spanne; Lücken davor oder danach sind zulässig (SCHEMA) und werden
// in Worten genannt, weil sie auf der Achse oft nur wenige Pixel breit sind. `kurz` für den Text neben dem Balken.
export function textAusserhalb(intervalle, von, bis, kurz = false) {
  if (!Number.isFinite(von) || !Number.isFinite(bis)) return '';
  const davor = intervalle.filter(([a]) => a < von);
  const danach = intervalle.filter(([, b]) => b > bis);
  const teile = [];
  if (davor.length) teile.push(`${jahreAlsText(davor)} ${kurz ? 'vor Beginn' : 'vor dem Beginn der Laufzeit'}`);
  if (danach.length) teile.push(`${jahreAlsText(danach)} ${kurz ? 'nach Ende' : 'nach dem Ende der Laufzeit'}`);
  return teile.join(', ');
}

// Kurztext neben dem Balken: bis `bisZu` Lücken mit Jahren, sonst zusammengefasst. `fehltWort` kommt aus dem Vokabular
// (Anzeigename der Ausprägung „fehlend“), damit der Code keine Ausprägungsnamen enthält.
export function kurztextLuecken(intervalle, fehltWort, bisZu = 3) {
  if (!intervalle.length) return '';
  if (intervalle.length <= bisZu) return `${fehltWort}: ${jahreAlsText(intervalle)}`;
  return `${intervalle.length} Lücken (${anzahlJahrgaenge(intervalle)} Jahrgänge)`;
}

// Volltext für Bildschirmleser und Hinweis
export function volltextLuecken(intervalle) {
  if (!intervalle.length) return '';
  const einzeln = intervalle.length === 1 && intervalle[0][0] === intervalle[0][1];
  return `${einzeln ? 'Jahrgang' : 'Jahrgänge'} ${jahreAlsText(intervalle)} nicht überliefert`;
}
