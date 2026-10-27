// js/utils/bestandSuche.js
// Suchfeld für alle Bestand-Visualisierungen (Wunsch des Autors, 2026-10-27): Eingabe von Name oder
// Kürzel, Vorschläge in einer Liste unter dem Feld; Eingabe/Auswahl eines Treffers öffnet die Sidebar dieses
// Bestands in der aktuell gezeigten Visualisierung (deren `oeffneDatensatz(kuerzel)`).
// Gibt es mehrere Treffer, gilt: genauer Treffer vor Wortanfang vor Teiltreffer.
// Seit 2026-10-28 (Wunsch des Autors) eigene Vorschlagsliste statt <datalist>: Zeigt die Maus auf einen
// Vorschlag oder steht die Pfeiltasten-Auswahl darauf, wird dieser Bestand in der Visualisierung schon
// vor der Auswahl hervorgehoben (`onVorschau(record)`, `onVorschau(null)` hebt das wieder auf). Die
// Browser-eigene <datalist> meldet kein Überfahren ihrer Einträge.

const text = (w) => String(w ?? '').trim();
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const anzeige = (r) => `${text(r.kuerzel)} – ${text(r.name)}`;
const MAX_VORSCHLAEGE = 12;

let zaehler = 0;

// liefereRecords(): aktuelle Bestandsliste (wird erst nach dem Laden gesetzt)
// onTreffer(record): öffnet den Bestand; gibt false zurück, wenn die Ansicht ihn nicht zeigt
// onVorschau(record | null): hebt den Bestand vorläufig hervor bzw. hebt die Hervorhebung auf
export function erzeugeBestandSuche(container, { liefereRecords, onTreffer, onVorschau }) {
  zaehler += 1;
  const id = `bestand-suche-${zaehler}`;
  const wurzel = document.createElement('form');
  wurzel.className = 'bestand-suche';
  wurzel.setAttribute('role', 'search');
  wurzel.innerHTML = `<label for="${id}">Bestand suchen</label>
    <span class="bestand-suche-feld">
      <input id="${id}" type="search" autocomplete="off" placeholder="Name oder Kürzel …" role="combobox"
        aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-liste">
      <ul id="${id}-liste" class="bestand-suche-vorschlaege" role="listbox" aria-label="Vorschläge" hidden></ul>
    </span>
    <span class="bestand-suche-status" role="status"></span>`;
  container.appendChild(wurzel);
  const eingabe = wurzel.querySelector('input');
  const liste = wurzel.querySelector('ul');
  const status = wurzel.querySelector('.bestand-suche-status');
  let vorschlaege = [];
  let aktiv = -1;
  let vorschauRecord = null;

  const bestaende = () => (liefereRecords() || []).filter((r) => text(r.kuerzel) || text(r.name));

  // Alle Treffer in der Reihenfolge genau > Wortanfang > Teiltreffer, ohne Doppelungen
  const treffer = (q) => {
    const f = fold(q);
    if (!f) return [];
    const records = bestaende();
    const stufen = [
      (r) => anzeige(r) === q || fold(text(r.kuerzel)) === f || fold(text(r.name)) === f,
      (r) => fold(text(r.name)).startsWith(f) || fold(text(r.kuerzel)).startsWith(f),
      (r) => fold(anzeige(r)).includes(f)
    ];
    const gesehen = new Set();
    const ergebnis = [];
    stufen.forEach((passt) => records.forEach((r) => {
      if (!gesehen.has(r) && passt(r)) { gesehen.add(r); ergebnis.push(r); }
    }));
    return ergebnis;
  };

  const zeigeVorschau = (record) => {
    if (record === vorschauRecord) return;
    vorschauRecord = record;
    onVorschau?.(record);
  };

  const markiere = (index) => {
    aktiv = index;
    [...liste.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === index)));
    if (index >= 0) {
      eingabe.setAttribute('aria-activedescendant', liste.children[index].id);
      liste.children[index].scrollIntoView({ block: 'nearest' });
    } else {
      eingabe.removeAttribute('aria-activedescendant');
    }
  };

  const schliesse = () => {
    liste.hidden = true;
    eingabe.setAttribute('aria-expanded', 'false');
    markiere(-1);
    zeigeVorschau(null);
  };

  const oeffneRecord = (record) => {
    eingabe.value = anzeige(record);
    schliesse();
    const ok = onTreffer(record);
    status.textContent = ok === false ? `„${text(record.name)}“ ist in dieser Ansicht nicht enthalten.` : '';
  };

  const fuelleListe = () => {
    vorschlaege = treffer(text(eingabe.value)).slice(0, MAX_VORSCHLAEGE);
    liste.innerHTML = '';
    vorschlaege.forEach((r, i) => {
      const li = document.createElement('li');
      li.id = `${id}-v${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.textContent = anzeige(r);
      li.addEventListener('mouseenter', () => { markiere(i); zeigeVorschau(r); });
      // mousedown statt click: das Feld verliert sonst vorher den Fokus und die Liste schließt sich
      li.addEventListener('mousedown', (e) => { e.preventDefault(); oeffneRecord(r); });
      liste.appendChild(li);
    });
    aktiv = -1;
    const offen = vorschlaege.length > 0;
    liste.hidden = !offen;
    eingabe.setAttribute('aria-expanded', String(offen));
    if (!offen) zeigeVorschau(null);
  };

  liste.addEventListener('mouseleave', () => { markiere(-1); zeigeVorschau(null); });
  eingabe.addEventListener('input', () => { status.textContent = ''; fuelleListe(); });
  eingabe.addEventListener('focus', () => { if (text(eingabe.value)) fuelleListe(); });
  eingabe.addEventListener('blur', schliesse);
  eingabe.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (liste.hidden) fuelleListe();
      if (!vorschlaege.length) return;
      e.preventDefault();
      const schritt = e.key === 'ArrowDown' ? 1 : -1;
      const neu = (aktiv + schritt + vorschlaege.length) % vorschlaege.length;
      markiere(neu);
      zeigeVorschau(vorschlaege[neu]);
    } else if (e.key === 'Escape' && !liste.hidden) {
      e.preventDefault();
      schliesse();
    }
  });
  wurzel.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = text(eingabe.value);
    if (!q) { status.textContent = ''; return; }
    const record = aktiv >= 0 ? vorschlaege[aktiv] : treffer(q)[0];
    if (!record) { status.textContent = 'Kein Bestand gefunden.'; schliesse(); return; }
    oeffneRecord(record);
  });

  return { destroy: () => { zeigeVorschau(null); wurzel.remove(); } };
}
