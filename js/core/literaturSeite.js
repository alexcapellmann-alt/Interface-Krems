// js/core/literaturSeite.js
// AUFTRAG "Literaturseite": ersetzt den bisherigen
// renderPlatzhalterTab('literatur', ...)-Aufruf in js/core/app.js. Zeigt
// data/literatur.csv (105 Einträge) gegliedert nach Themen statt als
// Suchmaske (Generous-Interface-Prinzip, Auftrag wörtlich) - Heimat- und
// Familienforscher:innen sollen einen Überblick bekommen, welche Literatur
// es gibt, wo sie online zugänglich ist und in welchen Führungen sie
// verwendet wird.
//
// Baustein-Muster wie startseite.js/ueberSeite.js: async, gibt
// {destroy(), oeffneDatensatz(id)} zurück - Letzteres ist neu (Punkt 6,
// Deep Link literatur:<id>, siehe js/utils/datensatzAufruf.js).
//
// Punkt 4 (Rückverweise auf Führungen) nutzt AUSSCHLIESSLICH die bereits
// bestehende Lade-/Parse-Logik aus js/fuehrungen/fuehrungenDaten.js
// (`ladeFuehrungenDaten()`, dort bereits `weiterlesen` je Führung gegen
// literatur.csv aufgelöst) - hier wird daraus nur noch ein umgekehrter
// Index literatur_id -> [{fuehrung_id, fuehrung_titel}] gebildet, KEINE
// zweite Pipe-Parse-/Auflösungslogik. fuehrungenDaten.js selbst bleibt
// unangetastet (nicht Teil der "Betroffenen Dateien" dieses Auftrags).
//
// Kategorien-Navigation (Punkt 2) als SPRUNGMARKEN-Leiste, bewusst NICHT
// über das bestehende js/utils/filterleiste.js gebaut: dessen
// Kategorie-Dropdown sortiert die Kategorienliste selbst alphabetisch
// (siehe dortiger Code) - das widerspricht direkt der hier geforderten
// "Reihenfolge = erstes Auftreten in der CSV"-Regel (Akzeptanzkriterium:
// erste Gruppe "Überblicke und Nachschlagewerke", letzte "Quelleneditionen
// und Regesten", keine alphabetische Sortierung). "Falls passend" (Auftrag
// wörtlich) trifft hier also nicht zu. WICHTIG: die Sprungmarken sind
// <button>-Elemente mit scrollIntoView(), KEINE <a href="#...">-Links -
// echte Hash-Links würden vom App-weiten hashchange-Router
// (js/core/router.js) als Tab-Navigation fehlinterpretiert.

import { ladeGecachteCSV } from './datenCache.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { infotextFuerModul } from './archivKonfiguration.js';
import { baueHash } from './router.js';
import { erzeugeLinkOderText } from '../utils/sichereUrl.js';
import { alsText, mitTextfeldern } from '../utils/textwert.js';

// AUFTRAG B1 (Prüfbericht Punkt 3): "|" macht im Loader jedes Feld zur Liste,
// auch Freitext - diese Felder werden hier als Text (Liste mit " | ") verarbeitet,
// sonst brach das Modul an vergleicheNachAutor() (localeCompare) ab.
const LITERATUR_TEXTFELDER = ['autor', 'titel', 'zitation', 'kurzbeschreibung', 'verfuegbarkeit'];
const RECHERCHE_TEXTFELDER = ['titel', 'beschreibung'];

const LITERATUR_CSV = 'data/literatur.csv';
const RECHERCHE_CSV = 'data/recherche_links.csv';
const OHNE_KATEGORIE = 'Weitere Literatur';

let instanz = null; // { container, wurzel, listeContainer, records, gruppen, ruecklinkeNachId, sortierung, elementeNachId, infoButton }

function slugifiziere(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // Umlaute/Akzente entfernen
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ladeRechercheLinks() {
  try {
    const records = await ladeGecachteCSV(RECHERCHE_CSV);
    return mitTextfeldern(records, RECHERCHE_TEXTFELDER)
      .filter((r) => r.sichtbar === 'ja')
      .sort((a, b) => Number(a.reihenfolge) - Number(b.reihenfolge));
  } catch (fehler) {
    console.warn(`${RECHERCHE_CSV} konnte nicht geladen werden - Bereich "Weiter recherchieren" entfällt.`, fehler);
    return [];
  }
}

// Punkt 4: baut literatur_id -> [{fuehrung_id, fuehrung_titel}] ausschließlich
// aus dem bereits von fuehrungenDaten.js aufbereiteten Ergebnis (jede
// Führung traegt ihre `weiterlesen`-Liste bereits fertig gegen
// literatur.csv aufgeloest, inkl. `record.literatur_id`) - nur erfolgreich
// aufgeloeste Eintraege (kein `fehler`) fliessen ein.
async function ermittleRuecklinke() {
  try {
    const { ladeFuehrungenDaten } = await import('../fuehrungen/fuehrungenDaten.js');
    const { fuehrungen } = await ladeFuehrungenDaten();
    const karte = new Map();
    fuehrungen.forEach((fuehrung) => {
      fuehrung.weiterlesen.forEach(({ record, fehler }) => {
        if (fehler || !record) return;
        const id = record.literatur_id;
        if (!karte.has(id)) karte.set(id, []);
        // AUFTRAG B1: fuehrung_titel (aus fuehrungen.csv) kann durch "|" eine Liste sein.
        karte.get(id).push({ fuehrung_id: fuehrung.fuehrung_id, fuehrung_titel: alsText(fuehrung.fuehrung_titel) });
      });
    });
    return karte;
  } catch (fehler) {
    console.warn('Rückverweise auf Führungen konnten nicht ermittelt werden.', fehler);
    return new Map();
  }
}

// Punkt 2: Kategorien in Reihenfolge ihres ERSTEN Auftretens in der CSV,
// Einträge ohne kategorie in einer Gruppe "Weitere Literatur" am Ende
// (auch wenn ein ohne-Kategorie-Eintrag früher in der Datei vorkäme).
function gruppiereNachKategorie(records) {
  const reihenfolge = [];
  const gruppen = new Map();
  records.forEach((r) => {
    const kategorie = r.kategorie || OHNE_KATEGORIE;
    if (!gruppen.has(kategorie)) { gruppen.set(kategorie, []); reihenfolge.push(kategorie); }
    gruppen.get(kategorie).push(r);
  });
  if (gruppen.has(OHNE_KATEGORIE)) {
    reihenfolge.splice(reihenfolge.indexOf(OHNE_KATEGORIE), 1);
    reihenfolge.push(OHNE_KATEGORIE);
  }
  return reihenfolge.map((kategorie) => [kategorie, gruppen.get(kategorie)]);
}

// Sortierung "Autor" (Standard): alphabetisch nach autor, bei leerem autor
// nach titel (Auftrag wörtlich) - localeCompare('de') fuer korrekte
// Umlaut-Einordnung, dieselbe Konvention wie ueberall sonst im Projekt.
function vergleicheNachAutor(a, b) {
  const av = a.autor || a.titel || '';
  const bv = b.autor || b.titel || '';
  return av.localeCompare(bv, 'de');
}

// Sortierung "Jahr": aufsteigend, Eintraege ohne Jahr am Ende (Auftrag
// wörtlich). `Number.isFinite` statt reinem Wahrheitswert-Check, damit ein
// (hier nicht vorkommendes, aber theoretisch moegliches) Jahr "0" nicht
// faelschlich als "kein Jahr" behandelt wuerde.
function vergleicheNachJahr(a, b) {
  const aj = parseInt(a.jahr, 10);
  const bj = parseInt(b.jahr, 10);
  const aOk = Number.isFinite(aj);
  const bOk = Number.isFinite(bj);
  if (aOk && bOk) return aj - bj;
  if (aOk) return -1;
  if (bOk) return 1;
  return 0;
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .literatur-wurzel { padding: var(--space-5) var(--space-4); }
    .literatur-kopf { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
      max-width: 1200px; margin: 0 auto var(--space-5) auto; }
    .literatur-kopf h2 { margin: 0; }

    /* Punkt 1: Recherche-Karten - breitere Spalte als die Leseliste unten,
       dasselbe Drei-Spalten-Kachelmuster wie startseite.css' .startseite-kacheln. */
    .literatur-recherche { max-width: 1200px; margin: 0 auto var(--space-6) auto; }
    .literatur-recherche h3 { margin: 0 0 var(--space-3) 0; }
    .literatur-recherche-karten { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
    @media (max-width: 900px) {
      .literatur-recherche-karten { grid-template-columns: 1fr; }
    }
    .literatur-recherche-karte { background: var(--surface); border: 1px solid var(--border);
      border-radius: calc(var(--radius) * 1.5); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }
    .literatur-recherche-karte h4 { margin: 0; font-size: var(--fs-md); }
    .literatur-recherche-karte p { margin: 0; color: var(--text-muted); font-size: var(--fs-sm); line-height: 1.6; }
    .literatur-recherche-karte a { align-self: flex-start; font-weight: 600; }

    /* Punkt 2: Kategorien-Sprungmarken + Sortierung, dieselbe max-width wie
       die Recherche-Karten (mehr Platz für bis zu 12 Kategorienamen als die
       70ch-Leseliste darunter erlauben würde). */
    .literatur-steuerung { max-width: 1200px; margin: 0 auto var(--space-5) auto; display: flex;
      flex-direction: column; gap: var(--space-3); }
    .literatur-kategorien-nav { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .literatur-kategorien-nav button { min-height: 36px; padding: 4px 12px; border-radius: 999px;
      border: 1px solid var(--border); background: var(--surface); color: var(--text); font: inherit; font-size: var(--fs-sm);
      cursor: pointer; }
    .literatur-kategorien-nav button:hover { border-color: var(--accent); color: var(--accent); }
    .literatur-kategorien-nav button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .literatur-sortierung { display: flex; align-items: center; gap: var(--space-2); font-size: var(--fs-sm); }
    .literatur-sortierung-gruppe { display: inline-flex; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .literatur-sortierung-gruppe button { min-height: 36px; padding: 4px 14px; border: none; background: var(--surface);
      color: var(--text); font: inherit; font-size: var(--fs-sm); cursor: pointer; }
    .literatur-sortierung-gruppe button + button { border-left: 1px solid var(--border); }
    .literatur-sortierung-gruppe button[aria-pressed="true"] { background: var(--accent); color: #fff; }
    .literatur-sortierung-gruppe button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

    /* Punkt 2, Textlayout: Lesespalte mit begrenzter Zeilenlänge, mittig -
       dieselbe 70ch-Konvention wie ueberSeite.js' .ueber-wurzel. */
    .literatur-liste { max-width: 70ch; margin: 0 auto; }
    .literatur-gruppe { margin-bottom: var(--space-6); }
    .literatur-gruppe-titel { border-bottom: 2px solid var(--border); padding-bottom: var(--space-2); }
    .literatur-eintrag { padding: var(--space-3) 0; border-bottom: 1px solid var(--border); }
    .literatur-eintrag:last-child { border-bottom: none; }
    .literatur-zitation { margin: 0 0 var(--space-2) 0; line-height: 1.6; }
    .literatur-kurzbeschreibung { margin: 0 0 var(--space-2) 0; color: var(--text-muted); font-size: var(--fs-sm); }
    .literatur-meta { margin: 0 0 var(--space-1) 0; font-size: var(--fs-sm); display: flex; flex-wrap: wrap; gap: var(--space-3); }
    .literatur-verwendet { margin: 0; font-size: var(--fs-sm); color: var(--text-muted); }
    .literatur-verwendet a { color: var(--accent); }
    /* Punkt 6: kurzes, wieder verschwindendes Hervorheben bei Deep-Link-
       Aufruf - dieselbe Übergangs-Konvention (kein rAF-Zwang, reine
       CSS-Transition) wie an anderer Stelle im Projekt fuer Hover-States. */
    .literatur-eintrag-hervorgehoben { background: color-mix(in srgb, var(--accent) 12%, transparent);
      transition: background 1.6s ease; }

    .literatur-leer { max-width: 70ch; margin: 0 auto; color: var(--text-muted); }
  `;
  container.appendChild(style);
}

function baueRechercheKarten(records) {
  if (records.length === 0) return null;
  const abschnitt = document.createElement('section');
  abschnitt.className = 'literatur-recherche';
  const titel = document.createElement('h3');
  titel.textContent = 'Weiter recherchieren';
  const karten = document.createElement('div');
  karten.className = 'literatur-recherche-karten';
  records.forEach((r) => {
    const karte = document.createElement('article');
    karte.className = 'literatur-recherche-karte';
    const kartenTitel = document.createElement('h4');
    kartenTitel.textContent = r.titel;
    karte.appendChild(kartenTitel);
    if (r.beschreibung) {
      const p = document.createElement('p');
      p.textContent = r.beschreibung;
      karte.appendChild(p);
    }
    if (r.link) {
      // AUFTRAG A (Sicherheit): Linkziel aus recherche_links.csv nur mit erlaubtem Schema.
      const { element: link, istLink } = erzeugeLinkOderText(r.link);
      if (istLink) {
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = `${r.titel} ↗`;
        link.setAttribute('aria-label', `${r.titel}, externer Link, öffnet in neuem Tab`);
      }
      karte.appendChild(link);
    }
    karten.appendChild(karte);
  });
  abschnitt.append(titel, karten);
  return abschnitt;
}

function baueEintrag(record, ruecklinkeNachId) {
  const artikel = document.createElement('article');
  artikel.className = 'literatur-eintrag';
  artikel.id = `literatur-eintrag-${record.literatur_id}`;

  const zitation = document.createElement('p');
  zitation.className = 'literatur-zitation';
  zitation.textContent = record.zitation;
  artikel.appendChild(zitation);

  if (record.kurzbeschreibung) {
    const kurz = document.createElement('p');
    kurz.className = 'literatur-kurzbeschreibung';
    kurz.textContent = record.kurzbeschreibung;
    artikel.appendChild(kurz);
  }

  if (record.link || record.verfuegbarkeit) {
    const meta = document.createElement('p');
    meta.className = 'literatur-meta';
    if (record.link) {
      const { element: link, istLink } = erzeugeLinkOderText(record.link);
      if (istLink) {
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'online ↗';
        link.setAttribute('aria-label', `${record.titel || record.zitation}, online verfügbar, externer Link, öffnet in neuem Tab`);
      }
      meta.appendChild(link);
    }
    if (record.verfuegbarkeit) {
      const verf = document.createElement('span');
      verf.textContent = record.verfuegbarkeit;
      meta.appendChild(verf);
    }
    artikel.appendChild(meta);
  }

  const ruecklinke = ruecklinkeNachId.get(record.literatur_id);
  if (ruecklinke && ruecklinke.length > 0) {
    const verwendet = document.createElement('p');
    verwendet.className = 'literatur-verwendet';
    verwendet.appendChild(document.createTextNode('Verwendet in: '));
    ruecklinke.forEach((eintrag, i) => {
      if (i > 0) verwendet.appendChild(document.createTextNode(', '));
      const link = document.createElement('a');
      link.href = baueHash(['fuehrungen', eintrag.fuehrung_id]);
      link.textContent = eintrag.fuehrung_titel;
      verwendet.appendChild(link);
    });
    artikel.appendChild(verwendet);
  }

  return artikel;
}

function zeichneListe() {
  const { listeContainer, gruppen, sortierung, ruecklinkeNachId } = instanz;
  listeContainer.innerHTML = '';
  instanz.elementeNachId = new Map();

  if (gruppen.length === 0) {
    const leer = document.createElement('p');
    leer.className = 'literatur-leer';
    leer.textContent = 'Derzeit sind keine Literatureinträge hinterlegt.';
    listeContainer.appendChild(leer);
    return;
  }

  const vergleichsFn = sortierung === 'jahr' ? vergleicheNachJahr : vergleicheNachAutor;

  gruppen.forEach(([kategorie, eintraege]) => {
    const gruppe = document.createElement('section');
    gruppe.className = 'literatur-gruppe';
    gruppe.id = `literatur-kategorie-${slugifiziere(kategorie)}`;
    const titel = document.createElement('h3');
    titel.className = 'literatur-gruppe-titel';
    titel.textContent = `${kategorie} (${eintraege.length})`;
    gruppe.appendChild(titel);

    [...eintraege].sort(vergleichsFn).forEach((record) => {
      const el = baueEintrag(record, ruecklinkeNachId);
      instanz.elementeNachId.set(record.literatur_id, el);
      gruppe.appendChild(el);
    });

    listeContainer.appendChild(gruppe);
  });
}

function baueKategorienNav(gruppen, listeContainer) {
  const nav = document.createElement('nav');
  nav.className = 'literatur-kategorien-nav';
  nav.setAttribute('aria-label', 'Zu einer Kategorie springen');
  gruppen.forEach(([kategorie]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = kategorie;
    // Bewusst button+scrollIntoView() statt <a href="#...">, siehe
    // Dateikopf-Kommentar: ein echter Hash-Link würde vom App-weiten
    // hashchange-Router als Tab-Wechsel fehlinterpretiert.
    btn.addEventListener('click', () => {
      const ziel = listeContainer.querySelector(`#literatur-kategorie-${slugifiziere(kategorie)}`);
      // Bewusst OHNE behavior:'smooth' - live geprüft (siehe PROJEKTLOG):
      // scrollIntoView({behavior:'smooth'}) blieb in diesem Testaufbau bei
      // scrollY=0 stehen (kein Fehler, aber wirkungslos), behavior:'smooth'
      // haengt wie eine CSS-/d3-Transition am Compositor-getriebenen
      // requestAnimationFrame - auf einem nicht sichtbaren/nicht
      // komponierten Tab feuert das nicht zuverlaessig (dieselbe, bereits an
      // anderer Stelle im Projekt dokumentierte Klasse von Problem, siehe
      // z.B. ganttDiagramm.js' wireZoom()-Kommentar zu d3 .transition()).
      // Ohne behavior (= 'auto') springt die Ansicht sofort und garantiert.
      ziel?.scrollIntoView({ block: 'start' });
    });
    nav.appendChild(btn);
  });
  return nav;
}

function baueSortierung() {
  const wrapper = document.createElement('div');
  wrapper.className = 'literatur-sortierung';
  const label = document.createElement('span');
  label.textContent = 'Sortierung:';
  const gruppe = document.createElement('div');
  gruppe.className = 'literatur-sortierung-gruppe';
  gruppe.setAttribute('role', 'group');
  gruppe.setAttribute('aria-label', 'Sortierung innerhalb der Kategorien');

  const btnAutor = document.createElement('button');
  btnAutor.type = 'button';
  btnAutor.textContent = 'Autor';
  const btnJahr = document.createElement('button');
  btnJahr.type = 'button';
  btnJahr.textContent = 'Jahr';

  function aktualisiere() {
    btnAutor.setAttribute('aria-pressed', String(instanz.sortierung === 'autor'));
    btnJahr.setAttribute('aria-pressed', String(instanz.sortierung === 'jahr'));
  }
  btnAutor.addEventListener('click', () => { instanz.sortierung = 'autor'; aktualisiere(); zeichneListe(); });
  btnJahr.addEventListener('click', () => { instanz.sortierung = 'jahr'; aktualisiere(); zeichneListe(); });
  aktualisiere();

  gruppe.append(btnAutor, btnJahr);
  wrapper.append(label, gruppe);
  return wrapper;
}

export async function erzeugeLiteraturSeite(container) {
  let records = [];
  try {
    records = await ladeGecachteCSV(LITERATUR_CSV); // AUFTRAG B2 (Cache-Umstellung)
    records = mitTextfeldern(records, LITERATUR_TEXTFELDER);
  } catch (fehler) {
    console.error(`${LITERATUR_CSV} konnte nicht geladen werden.`, fehler);
  }
  const [rechercheRecords, ruecklinkeNachId] = await Promise.all([
    ladeRechercheLinks(),
    ermittleRuecklinke()
  ]);

  container.innerHTML = '';
  container.className = 'literatur-wurzel';
  fuegeStyleEin(container);

  const kopf = document.createElement('div');
  kopf.className = 'literatur-kopf';
  const titel = document.createElement('h2');
  titel.textContent = 'Literatur';
  kopf.appendChild(titel);
  container.appendChild(kopf);

  const recherche = baueRechercheKarten(rechercheRecords);
  if (recherche) container.appendChild(recherche);

  const gruppen = gruppiereNachKategorie(records);

  const listeContainer = document.createElement('div');
  listeContainer.className = 'literatur-liste';

  const steuerung = document.createElement('div');
  steuerung.className = 'literatur-steuerung';
  if (gruppen.length > 0) {
    steuerung.appendChild(baueKategorienNav(gruppen, listeContainer));
  }

  instanz = {
    container,
    listeContainer,
    records,
    gruppen,
    ruecklinkeNachId,
    sortierung: 'autor',
    elementeNachId: new Map(),
    infoButton: null
  };

  if (gruppen.length > 0) {
    steuerung.appendChild(baueSortierung());
  }
  container.appendChild(steuerung);
  container.appendChild(listeContainer);

  zeichneListe();

  infotextFuerModul('literaturSeite').then((cfg) => {
    if (!instanz || !cfg || !kopf.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(kopf, cfg);
  });

  return {
    destroy() {
      if (instanz?.infoButton) instanz.infoButton.destroy();
      container.innerHTML = '';
      container.className = '';
      instanz = null;
    },
    // Punkt 6: Deep Link literatur:<id> (js/utils/datensatzAufruf.js) -
    // scrollt zum Eintrag und hebt ihn kurz hervor, dieselbe Rückgabe-
    // Konvention (true/false) wie die uebrigen oeffneDatensatz()-Module.
    oeffneDatensatz(literaturId) {
      if (!instanz) return false;
      const el = instanz.elementeNachId.get(literaturId);
      if (!el) return false;
      // Kein behavior:'smooth' - siehe Kommentar in baueKategorienNav() oben.
      el.scrollIntoView({ block: 'center' });
      el.classList.add('literatur-eintrag-hervorgehoben');
      setTimeout(() => el.classList.remove('literatur-eintrag-hervorgehoben'), 1600);
      return true;
    }
  };
}
