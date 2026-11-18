// js/core/unsicherheitVokabular.js
// Auftrag 13 (Stufe B): Anzeigetexte des Modus „Licht aus“ aus den Datendateien – Typen (unsicherheit_typen.csv),
// Ausprägungen (unsicherheit_auspraegungen.csv) und Methodenhinweise (methodenhinweise.csv). Einmal geladen, danach
// über die synchronen Abfragen erreichbar. Fehlt eine Datei, bleiben die Listen leer: Die Leiste zeigt dann nur
// „Alle“, die Detailansicht nennt die Rohwerte (typ/auspraegung), nichts bricht ab.
// Seit 18.11.2026 zusätzlich Standardtexte je Datei, Feld und Ausprägung (unsicherheit_standardtexte.csv): Sie gelten,
// wenn ein Datensatz zu einem Feld mit Typ keine eigene Erklärung in `unsicherheit_anmerkung` hat.
import { ladeCSV } from './dataLoader.js';
import { erklaerungFuerFeldAus, beschreibungFuerFelder } from '../utils/uncertainty.js';

const ORDNER = 'data/';
let versprechen = null;
let stand = { typen: [], auspraegungen: [], hinweise: [], standardtexte: [] };

const nachReihenfolge = (a, b) => (Number(a.reihenfolge) || 0) - (Number(b.reihenfolge) || 0);
const liesOderLeer = (pfad) => ladeCSV(pfad).then((r) => r.records).catch(() => []);

export function ladeUnsicherheitVokabular() {
  if (!versprechen) {
    versprechen = Promise.all([
      liesOderLeer(`${ORDNER}unsicherheit_typen.csv`),
      liesOderLeer(`${ORDNER}unsicherheit_auspraegungen.csv`),
      liesOderLeer(`${ORDNER}methodenhinweise.csv`),
      liesOderLeer(`${ORDNER}unsicherheit_standardtexte.csv`)
    ]).then(([typen, auspraegungen, hinweise, standardtexte]) => {
      stand = {
        typen: typen.filter((t) => t.typ_id).sort(nachReihenfolge),
        auspraegungen: auspraegungen.filter((a) => a.auspraegung_id).sort(nachReihenfolge),
        hinweise: hinweise.filter((h) => h.id && h.text),
        standardtexte: standardtexte.filter((s) => s.datei && s.feld && s.auspraegung && s.text)
      };
      return stand;
    });
  }
  return versprechen;
}

export const typenListe = () => stand.typen;
export const auspraegungenListe = () => stand.auspraegungen;
export const methodenhinweise = () => stand.hinweise;
export const typName = (id) => stand.typen.find((t) => t.typ_id === id)?.anzeigename || id;
export const typErklaerung = (id) => stand.typen.find((t) => t.typ_id === id)?.erklaerung || '';
export const auspraegungName = (id) => stand.auspraegungen.find((a) => a.auspraegung_id === id)?.anzeigename || id;
export const auspraegungErklaerung = (id) => stand.auspraegungen.find((a) => a.auspraegung_id === id)?.erklaerung || '';

const klein = (v) => String(v ?? '').trim().toLowerCase();
export const standardText = (datei, feld, auspraegung) => stand.standardtexte.find((s) => klein(s.datei) === klein(datei)
  && klein(s.feld) === klein(feld) && klein(s.auspraegung) === klein(auspraegung))?.text || '';

// Erklärung zu einem Feld bzw. Beschreibung mehrerer Felder (Logik in js/utils/uncertainty.js)
export const erklaerungFuerFeld = (record, datei, feld) => erklaerungFuerFeldAus(record, datei, feld, stand.standardtexte);
export const beschreibungFuerKachel = (record, datei, felder) => beschreibungFuerFelder(record, datei, felder, stand.standardtexte);
