// js/beteiligung/sendeVorschlag.js
// Partizipations-Modul (Masterprompt Abschnitt 5a): EINZIGE Stelle, die einen Änderungsvorschlag
// überträgt. Formular-Anzeige (vorschlagFormular.js) und Versand sind bewusst getrennt - ein späterer
// Wechsel des Dienstes (z. B. selbst gehosteter EU-Dienst, Abschnitt 16) betrifft nur diese Datei.
//
// Prototyp-Stufe: Forminit, Public-Modus (ohne API-Schlüssel). Ziel-URL und Schalter stehen in
// archiv.csv (`beteiligung_endpunkt`, `beteiligung_aktiv`) - Abweichung vom Masterprompt (dort
// constants.js), Entscheidung des Autors 2026-10-27: alle archivspezifischen Einstellungen in den CSVs.
// Feldnamen nach Forminit-Konvention `fi-{typ}-{name}`; `fi-sender-*` erlaubt nur feste Namen
// (fullName, email …), alles Übrige geht als `fi-text-*`. `_gotcha` ist das unsichtbare Honeypot-Feld.
// Vorschläge werden NIE in die kuratierten CSV-Dateien geschrieben (Abschnitt 5a/15).

const TEXTFELDER = ['bezug_typ', 'bezug_id', 'bezug_titel', 'feld_name', 'inhalt_alt', 'typ', 'inhalt_vorschlag', 'begruendung', 'quelle'];

// daten: { name, email, honeypot, bezug_typ, bezug_id, bezug_titel, feld_name, inhalt_alt, typ,
//          inhalt_vorschlag, begruendung, quelle }
// Ergebnis: { ok: true } oder { ok: false, grund: 'zu-viele' | 'abgelehnt' | 'netzwerk' }
// (die englischen Entwicklertexte des Dienstes werden nie angezeigt).
export async function sendeVorschlag(endpunkt, daten) {
  const fd = new FormData();
  fd.append('fi-sender-fullName', daten.name || '');
  fd.append('fi-sender-email', daten.email || '');
  TEXTFELDER.forEach((feld) => { if (daten[feld]) fd.append(`fi-text-${feld}`, String(daten[feld])); });
  fd.append('_gotcha', daten.honeypot || '');
  let antwort;
  try {
    antwort = await fetch(endpunkt, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
  } catch {
    return { ok: false, grund: 'netzwerk' };
  }
  if (antwort.status === 429) return { ok: false, grund: 'zu-viele' };
  let inhalt = null;
  try { inhalt = await antwort.json(); } catch { /* kein JSON */ }
  if (antwort.ok && inhalt?.success !== false) return { ok: true };
  console.warn('Vorschlag nicht angenommen:', antwort.status, inhalt?.error || '');
  return { ok: false, grund: 'abgelehnt' };
}
