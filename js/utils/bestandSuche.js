// js/utils/bestandSuche.js
// Suchfeld für alle Bestand-Visualisierungen (Wunsch des Autors, 2026-10-27): Eingabe von Name oder
// Kürzel, Vorschläge über eine <datalist>; Eingabe/Auswahl eines Treffers öffnet die Sidebar dieses
// Bestands in der aktuell gezeigten Visualisierung (deren `oeffneDatensatz(kuerzel)`).
// Gibt es mehrere Treffer, gilt: genauer Treffer vor Wortanfang vor Teiltreffer.

const text = (w) => String(w ?? '').trim();
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const anzeige = (r) => `${text(r.kuerzel)} – ${text(r.name)}`;

let zaehler = 0;

// liefereRecords(): aktuelle Bestandsliste (wird erst nach dem Laden gesetzt)
// onTreffer(record): öffnet den Bestand; gibt false zurück, wenn die Ansicht ihn nicht zeigt
export function erzeugeBestandSuche(container, { liefereRecords, onTreffer }) {
  zaehler += 1;
  const id = `bestand-suche-${zaehler}`;
  const wurzel = document.createElement('form');
  wurzel.className = 'bestand-suche';
  wurzel.setAttribute('role', 'search');
  wurzel.innerHTML = `<label for="${id}">Bestand suchen</label>
    <input id="${id}" type="search" list="${id}-liste" autocomplete="off" placeholder="Name oder Kürzel …">
    <datalist id="${id}-liste"></datalist>
    <span class="bestand-suche-status" role="status"></span>`;
  container.appendChild(wurzel);
  const eingabe = wurzel.querySelector('input');
  const liste = wurzel.querySelector('datalist');
  const status = wurzel.querySelector('.bestand-suche-status');
  let gefuellt = null;

  const fuelleListe = () => {
    const records = liefereRecords() || [];
    if (gefuellt === records) return;
    liste.innerHTML = '';
    records.filter((r) => text(r.kuerzel) || text(r.name)).forEach((r) => {
      const o = document.createElement('option');
      o.value = anzeige(r);
      liste.appendChild(o);
    });
    gefuellt = records;
  };

  const finde = (q) => {
    const records = (liefereRecords() || []).filter((r) => text(r.kuerzel) || text(r.name));
    const genau = records.find((r) => anzeige(r) === q);
    if (genau) return genau;
    const f = fold(q);
    if (!f) return null;
    const stufen = [
      (r) => fold(text(r.kuerzel)) === f || fold(text(r.name)) === f,
      (r) => fold(text(r.name)).startsWith(f) || fold(text(r.kuerzel)).startsWith(f),
      (r) => fold(anzeige(r)).includes(f)
    ];
    for (const passt of stufen) {
      const treffer = records.filter(passt);
      if (treffer.length) return treffer[0];
    }
    return null;
  };

  const oeffne = (ausAuswahl) => {
    const q = text(eingabe.value);
    if (!q) { status.textContent = ''; return; }
    const record = finde(q);
    if (!record) { if (!ausAuswahl) status.textContent = 'Kein Bestand gefunden.'; return; }
    const ok = onTreffer(record);
    status.textContent = ok === false ? `„${text(record.name)}“ ist in dieser Ansicht nicht enthalten.` : '';
  };

  eingabe.addEventListener('focus', fuelleListe);
  eingabe.addEventListener('input', () => {
    fuelleListe();
    status.textContent = '';
    // Auswahl aus der Vorschlagsliste: der Wert entspricht dann genau einem Eintrag
    if ([...liste.options].some((o) => o.value === eingabe.value)) oeffne(true);
  });
  wurzel.addEventListener('submit', (e) => { e.preventDefault(); oeffne(false); });

  return { destroy: () => wurzel.remove() };
}
