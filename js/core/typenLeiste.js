// js/core/typenLeiste.js
// Auftrag 13 (Stufe B, Punkt 2): Typenleiste des Modus „Licht aus“ – eigene Zeile unter der σ-Zeile.
//
// Zeile 1 (role=toolbar): „Zeige:“, „Alle“, je Typ aus data/unsicherheit_typen.csv eine Schaltfläche mit Zahl,
//   „Nur diese zeigen“ (filtert statt dimmt, Entscheidung 8) und „Licht wieder an (Esc)“.
//   - Typen, die in der Ansicht nicht vorkommen: ausgegraut (aria-disabled, bleiben per Tastatur erreichbar) mit
//     Begründung; in der Kompaktvariante (Fenster niedriger als KOMPAKT_UNTER_HOEHE) stattdessen ein Aufklapper
//     „n weitere Arten“ mit denselben Begründungen.
// Zeile 2: Legende der Muster (nur die Ausprägungen, die gerade leuchten), Zusatzschalter der Massenangaben mit
//   sichtbarer Zahl (Entscheidung 3), Hinweise zur Methode (Aufklapper), Erklärzeile.
// Erklärungen (Typ, Ausprägung, Grund, Hinweis zur Massenangabe) stehen über aria-describedby an der Schaltfläche und
// erscheinen beim Fokus oder Überfahren zusätzlich sichtbar in der Erklärzeile – nicht nur als Mausbeschriftung.
// Alle Texte kommen aus den Datendateien (js/core/unsicherheitVokabular.js); die Leiste rechnet nicht selbst.
import { typenListe, typName, auspraegungenListe, auspraegungName, auspraegungErklaerung } from './unsicherheitVokabular.js';
import { feldBezeichnung } from '../utils/uncertainty.js';
import { MUSTER_JE_AUSPRAEGUNG } from '../config/lichtAus.js';
import { musterFuer } from '../utils/lichtAus.js';

let zaehler = 0;
const neueId = (teil) => `lichtaus-${teil}-${++zaehler}`;
const zahl = (n) => Number(n || 0).toLocaleString('de-AT');
const feldName = (feld) => { const b = feldBezeichnung(feld).replace(/_/g, ' '); return b.charAt(0).toUpperCase() + b.slice(1); };

function element(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text != null) e.textContent = text;
  return e;
}

function beschreibung(eltern, text) {
  const s = element('span', 'nur-fuer-hilfsmittel', text);
  s.id = neueId('beschreibung');
  eltern.appendChild(s);
  return s.id;
}

export function erzeugeTypenLeiste(nachElement) {
  const wurzel = element('div', 'lichtaus-leiste');
  wurzel.hidden = true;
  let weitereEsc = null;
  wurzel.addEventListener('keydown', (e) => weitereEsc?.(e));
  nachElement.after(wurzel);
  let letzterStand = null;

  function zeige(stand) {
    letzterStand = stand;
    const { zaehlung, massengruppen = [], auswahl, nurDieseMoeglich, nurDieseGrund, hinweise = [], kompakt, ansichtName, onAuswahl, onAus } = stand;
    const fokusVorher = document.activeElement && wurzel.contains(document.activeElement) ? document.activeElement.dataset.lichtausId : null;
    wurzel.textContent = '';
    wurzel.hidden = false;
    weitereEsc = null;
    wurzel.classList.toggle('lichtaus-kompakt', Boolean(kompakt));
    const ablage = element('div', 'nur-fuer-hilfsmittel');
    const erklaerzeile = element('p', 'lichtaus-erklaerung');
    erklaerzeile.id = neueId('erklaerung');
    const erklaere = (text) => { erklaerzeile.textContent = text || ''; };

    const zeile = element('div', 'lichtaus-zeile');
    zeile.setAttribute('role', 'toolbar');
    zeile.setAttribute('aria-label', 'Art der Unsicherheit');
    zeile.appendChild(element('span', 'lichtaus-titel', 'Zeige:'));

    const knopf = ({ id, text, anzahl, gedrueckt, gesperrt, erklaerung, klasse, beiKlick }) => {
      const b = element('button', `lichtaus-knopf ${klasse || ''}`.trim());
      b.type = 'button';
      b.dataset.lichtausId = id;
      b.append(document.createTextNode(text));
      if (anzahl != null) b.appendChild(element('span', 'lichtaus-zahl', zahl(anzahl)));
      if (gedrueckt != null) b.setAttribute('aria-pressed', String(Boolean(gedrueckt)));
      if (gesperrt) b.setAttribute('aria-disabled', 'true');
      if (erklaerung) {
        b.setAttribute('aria-describedby', beschreibung(ablage, erklaerung));
        b.addEventListener('focus', () => erklaere(erklaerung));
        b.addEventListener('mouseenter', () => erklaere(erklaerung));
      }
      b.addEventListener('click', () => { if (gesperrt) { erklaere(erklaerung); return; } beiKlick(); });
      return b;
    };

    const gewaehlt = (typ) => auswahl.typen !== 'alle' && auswahl.typen.includes(typ);
    zeile.appendChild(knopf({ id: 'alle', text: 'Alle', anzahl: zaehlung.alle, gedrueckt: auswahl.typen === 'alle',
      erklaerung: 'Alle Arten von Unsicherheit in dieser Ansicht.' + (massengruppen.length ? ' Massenangaben zählen erst mit, wenn Sie sie unten einbeziehen.' : ''),
      beiKlick: () => onAuswahl({ art: 'typ', wert: 'alle' }) }));

    const typMitMasse = new Set(massengruppen.filter((g) => zaehlung.proMasse[g.schluessel]).map((g) => g.typ));
    const fehlend = [];
    for (const t of typenListe()) {
      const n = zaehlung.proTyp[t.typ_id] || 0;
      const vorhanden = n > 0 || typMitMasse.has(t.typ_id);
      const erklaerung = `${t.anzeigename}: ${t.erklaerung}`;
      if (!vorhanden) {
        const grund = `${t.anzeigename}: In ${ansichtName || 'dieser Ansicht'} gibt es keine Angaben dieser Art.`;
        fehlend.push({ t, grund });
        if (!kompakt) zeile.appendChild(knopf({ id: t.typ_id, text: t.anzeigename, anzahl: 0, gedrueckt: false, gesperrt: true, erklaerung: grund, klasse: 'lichtaus-ausgegraut', beiKlick: () => {} }));
        continue;
      }
      zeile.appendChild(knopf({ id: t.typ_id, text: t.anzeigename, anzahl: n, gedrueckt: gewaehlt(t.typ_id), erklaerung,
        beiKlick: () => onAuswahl({ art: 'typ', wert: t.typ_id }) }));
    }
    if (kompakt && fehlend.length) {
      const auf = element('button', 'lichtaus-knopf lichtaus-weitere', `${fehlend.length} weitere Arten`);
      auf.type = 'button';
      auf.dataset.lichtausId = 'weitere';
      auf.setAttribute('aria-expanded', 'false');
      const liste = element('ul', 'lichtaus-weitere-liste');
      liste.id = neueId('weitere');
      liste.hidden = true;
      auf.setAttribute('aria-controls', liste.id);
      fehlend.forEach(({ grund }) => liste.appendChild(element('li', null, grund)));
      auf.addEventListener('click', () => { const offen = auf.getAttribute('aria-expanded') === 'true'; auf.setAttribute('aria-expanded', String(!offen)); liste.hidden = offen; });
      // Esc schließt zuerst den Aufklapper (der Modus bleibt an; erst das nächste Esc beendet ihn)
      weitereEsc = (e) => { if (e.key === 'Escape' && auf.getAttribute('aria-expanded') === 'true') { auf.setAttribute('aria-expanded', 'false'); liste.hidden = true; auf.focus(); } };
      const weitere = element('span', 'lichtaus-weitere-bereich');
      weitere.append(auf, liste);
      zeile.appendChild(weitere);
    }

    zeile.appendChild(knopf({ id: 'nurdiese', text: 'Nur diese zeigen', gedrueckt: auswahl.nurDiese && nurDieseMoeglich, gesperrt: !nurDieseMoeglich, klasse: 'lichtaus-nurdiese',
      erklaerung: nurDieseMoeglich ? 'Blendet alles aus, was gerade nicht leuchtet (filtern statt abdunkeln).' : (nurDieseGrund || 'In dieser Ansicht nicht möglich.'),
      beiKlick: () => onAuswahl({ art: 'nurDiese' }) }));
    zeile.appendChild(knopf({ id: 'aus', text: 'Licht wieder an (Esc)', klasse: 'lichtaus-aus', beiKlick: () => onAus() }));

    const zeile2 = element('div', 'lichtaus-zeile lichtaus-zeile-2');
    const reihenfolge = auspraegungenListe().map((a) => a.auspraegung_id);
    const sichtbar = [...zaehlung.auspraegungen].sort((a, b) => reihenfolge.indexOf(a) - reihenfolge.indexOf(b));
    if (sichtbar.length) {
      const legende = element('ul', 'lichtaus-legende');
      legende.setAttribute('aria-label', 'Muster der Ausprägungen');
      for (const a of sichtbar) {
        const li = element('li', 'lichtaus-legende-eintrag');
        const probe = element('span', 'lichtaus-probe');
        probe.dataset.muster = musterFuer(a, MUSTER_JE_AUSPRAEGUNG);
        probe.setAttribute('aria-hidden', 'true');
        li.append(probe, document.createTextNode(`${auspraegungName(a)}`));
        li.title = auspraegungErklaerung(a);
        legende.appendChild(li);
      }
      zeile2.append(element('span', 'lichtaus-titel', 'Muster:'), legende);
    }
    for (const g of massengruppen) {
      const n = zaehlung.proMasse[g.schluessel] || 0;
      if (!n) continue;
      const ein = (auswahl.masseEin || []).includes(g.schluessel);
      const text = `${ein ? '−' : '+'} ${feldName(g.feld)}: ${auspraegungName(g.auspraegung)}`;
      const erkl = `${typName(g.typ)}, ${auspraegungName(g.auspraegung)}: betrifft ${zahl(g.anzahl)} von ${zahl(Math.round(g.anzahl / g.anteil))} Einträgen und zählt deshalb bei „Alle“ nicht mit.${g.hinweis ? ` ${g.hinweis}` : ''}`;
      zeile2.appendChild(knopf({ id: `masse-${g.schluessel}`, text, anzahl: n, gedrueckt: ein, klasse: 'lichtaus-masse', erklaerung: erkl,
        beiKlick: () => onAuswahl({ art: 'masse', wert: g.schluessel }) }));
    }
    if (hinweise.length) {
      const details = element('details', 'lichtaus-hinweise');
      details.appendChild(element('summary', null, `Hinweise zur Methode (${hinweise.length})`));
      const ul = element('ul');
      hinweise.forEach((h) => ul.appendChild(element('li', null, h.text)));
      details.appendChild(ul);
      zeile2.appendChild(details);
    }
    wurzel.append(zeile, zeile2, erklaerzeile, ablage);
    if (fokusVorher) wurzel.querySelector(`[data-lichtaus-id="${CSS.escape(fokusVorher)}"]`)?.focus();
  }

  return {
    element: wurzel,
    zeige,
    verstecke() { wurzel.hidden = true; wurzel.textContent = ''; letzterStand = null; },
    aktualisiereKompakt(kompakt) { if (letzterStand && letzterStand.kompakt !== kompakt) zeige({ ...letzterStand, kompakt }); },
    destroy() { wurzel.remove(); }
  };
}

