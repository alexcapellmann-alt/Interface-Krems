// js/beteiligung/vorschlagFormular.js
// Partizipations-Modul (Masterprompt Abschnitt 5a): Formular für einen Änderungsvorschlag zu EINEM
// Datensatz (Urkunde, Bürgerbuch-Eintrag, Verlassenschaftsinventar, Ort). Nur Anzeige und Prüfung der
// Eingaben - übertragen wird ausschließlich über sendeVorschlag.js.
//
// Platzierung (Wunsch des Autors, 2026-10-27): in den Sidebars der Urkunden, Personen und Orte. Hat
// der Datensatz einen „σ Angaben unsicher“-Hinweis, erscheint das Formular in dessen aufgeklapptem
// Feld (js/utils/unsicherAbsatz.js); sonst über einen eigenen Knopf „Änderung vorschlagen“.
//
// Versteckt mitgesendet: bezug_typ, bezug_id, bezug_titel, feld_name, inhalt_alt (der aktuelle Wert
// des gewählten Feldes). Sichtbar: Feld, Art, Vorschlag (Pflicht), Begründung, Quelle, Name und
// E-Mail (Pflicht). Kein Konto, keine Identitätsprüfung; das Archiv prüft jeden Vorschlag selbst.

import { konfigurationswert } from '../core/archivKonfiguration.js';
import { sendeVorschlag } from './sendeVorschlag.js';

const ARTEN = ['Korrektur', 'Ergänzung', 'Neuvorschlag'];
let laufendeNummer = 0;

// Aktiv nur mit `beteiligung_aktiv = ja` und einer https-Adresse in `beteiligung_endpunkt`
export function beteiligungAktiv() {
  const aktiv = String(konfigurationswert('beteiligung_aktiv') || '').trim().toLowerCase() === 'ja';
  return aktiv && /^https:\/\//.test(String(konfigurationswert('beteiligung_endpunkt') || '').trim());
}

const textwert = (w) => (Array.isArray(w) ? w.join('; ') : String(w ?? '')).trim();

function feld(label, element, hinweis) {
  const wrap = document.createElement('div');
  wrap.className = 'vorschlag-feld';
  const id = `vorschlag-${laufendeNummer}-${element.name}`;
  element.id = id;
  const l = document.createElement('label');
  l.htmlFor = id;
  l.textContent = label;
  wrap.append(l);
  if (hinweis) {
    const h = document.createElement('span');
    h.className = 'vorschlag-feld-hinweis';
    h.id = `${id}-hinweis`;
    h.textContent = hinweis;
    element.setAttribute('aria-describedby', h.id);
    wrap.append(h);
  }
  wrap.append(element);
  return wrap;
}

function eingabe(name, { typ = 'text', pflicht = false, mehrzeilig = false, autocomplete } = {}) {
  const el = document.createElement(mehrzeilig ? 'textarea' : 'input');
  el.name = name;
  if (!mehrzeilig) el.type = typ;
  else el.rows = 3;
  if (pflicht) el.required = true;
  if (autocomplete) el.autocomplete = autocomplete;
  return el;
}

function auswahl(name, optionen) {
  const el = document.createElement('select');
  el.name = name;
  optionen.forEach(({ wert, text }) => {
    const o = document.createElement('option');
    o.value = wert;
    o.textContent = text;
    el.appendChild(o);
  });
  return el;
}

// bezug: { typ: 'urkunde', id: 'StaAKr-0091', titel: 'StaAKr-0091, 1398 III 12',
//          felder: [{ name: 'datum', label: 'Datum', wert: '1398 III 12' }, …] }
export function baueVorschlagFormular(bezug) {
  if (!beteiligungAktiv()) return null;
  laufendeNummer += 1;
  const form = document.createElement('form');
  form.className = 'vorschlag-formular';
  form.noValidate = false;
  form.setAttribute('aria-label', `Änderung vorschlagen zu ${bezug.titel}`);

  const einleitung = document.createElement('p');
  einleitung.className = 'vorschlag-einleitung';
  einleitung.textContent = 'Haben Sie eine Korrektur oder Ergänzung? Das Archiv prüft jeden Vorschlag, bevor etwas geändert wird.';

  const felder = (bezug.felder || []).filter((f) => f.label);
  const feldWahl = auswahl('feld_name', [...felder.map((f) => ({ wert: f.name, text: f.label })), { wert: 'sonstiges', text: 'Sonstiges' }]);
  const art = auswahl('typ', ARTEN.map((a) => ({ wert: a, text: a })));
  const vorschlag = eingabe('inhalt_vorschlag', { pflicht: true, mehrzeilig: true });
  const begruendung = eingabe('begruendung', { mehrzeilig: true });
  const quelle = eingabe('quelle');
  const name = eingabe('name', { pflicht: true, autocomplete: 'name' });
  const email = eingabe('email', { typ: 'email', pflicht: true, autocomplete: 'email' });

  // Aktueller Wert des gewählten Feldes, zur Orientierung sichtbar und versteckt mitgesendet
  const altAnzeige = document.createElement('p');
  altAnzeige.className = 'vorschlag-alt';
  const aktualisiereAlt = () => {
    const wert = textwert(felder.find((f) => f.name === feldWahl.value)?.wert);
    altAnzeige.textContent = wert ? `Bisher: ${wert.length > 160 ? `${wert.slice(0, 157)} …` : wert}` : '';
    altAnzeige.hidden = !wert;
  };
  feldWahl.addEventListener('change', aktualisiereAlt);

  // Honeypot: für Menschen unsichtbar und nicht erreichbar; Bots füllen es aus
  const falle = document.createElement('input');
  falle.type = 'text';
  falle.name = '_gotcha';
  falle.tabIndex = -1;
  falle.autocomplete = 'off';
  falle.className = 'vorschlag-falle';
  falle.setAttribute('aria-hidden', 'true');

  const hinweis = document.createElement('p');
  hinweis.className = 'vorschlag-datenschutz';
  hinweis.textContent = 'Name und E-Mail-Adresse werden mit dem Vorschlag über den Formulardienst Forminit an das Archiv übermittelt, damit es bei Rückfragen Kontakt aufnehmen kann.';

  const senden = document.createElement('button');
  senden.type = 'submit';
  senden.className = 'vorschlag-senden';
  senden.textContent = 'Vorschlag senden';
  const status = document.createElement('p');
  status.className = 'vorschlag-status';
  status.setAttribute('role', 'status');

  form.append(
    einleitung,
    feld('Betrifft', feldWahl), altAnzeige,
    feld('Art', art),
    feld('Ihr Vorschlag (Pflicht)', vorschlag),
    feld('Begründung', begruendung),
    feld('Quelle oder Beleg', quelle, 'z. B. Literaturangabe, Signatur oder Link'),
    feld('Name (Pflicht)', name),
    feld('E-Mail (Pflicht)', email),
    falle, hinweis, senden, status
  );
  aktualisiereAlt();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (!vorschlag.value.trim()) { vorschlag.focus(); return; }
    senden.disabled = true;
    status.textContent = 'Wird gesendet …';
    const ergebnis = await sendeVorschlag(String(konfigurationswert('beteiligung_endpunkt')).trim(), {
      name: name.value.trim(), email: email.value.trim(), honeypot: falle.value,
      bezug_typ: bezug.typ, bezug_id: bezug.id, bezug_titel: bezug.titel,
      feld_name: feldWahl.value, inhalt_alt: textwert(felder.find((f) => f.name === feldWahl.value)?.wert),
      typ: art.value, inhalt_vorschlag: vorschlag.value.trim(), begruendung: begruendung.value.trim(), quelle: quelle.value.trim()
    });
    if (ergebnis.ok) {
      const danke = document.createElement('p');
      danke.className = 'vorschlag-danke';
      danke.setAttribute('role', 'status');
      danke.tabIndex = -1;
      danke.textContent = 'Danke! Ihr Vorschlag ist eingegangen. Das Archiv prüft ihn und meldet sich bei Rückfragen per E-Mail.';
      form.replaceWith(danke);
      danke.focus();
      return;
    }
    senden.disabled = false;
    status.textContent = ergebnis.grund === 'zu-viele'
      ? 'Bitte warten Sie einige Sekunden und senden Sie dann erneut.'
      : 'Der Vorschlag konnte nicht gesendet werden. Bitte versuchen Sie es später noch einmal.';
  });
  return form;
}

// Eigener aufklappbarer Knopf „Änderung vorschlagen“ für Datensätze OHNE Unsicherheits-Hinweis
// (dasselbe Bedienmuster wie der σ-Hinweis: natives <button>, aria-expanded, startet eingeklappt).
export function baueVorschlagAufklapper(bezug) {
  const form = baueVorschlagFormular(bezug);
  if (!form) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'vorschlag-aufklapper';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'vorschlag-btn';
  btn.textContent = '✎ Änderung vorschlagen';
  btn.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('div');
  panel.className = 'vorschlag-panel';
  panel.hidden = true;
  panel.appendChild(form);
  btn.addEventListener('click', () => {
    const offen = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!offen));
    panel.hidden = offen;
  });
  wrapper.append(btn, panel);
  return wrapper;
}
