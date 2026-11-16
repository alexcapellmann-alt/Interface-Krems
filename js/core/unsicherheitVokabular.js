// js/core/unsicherheitVokabular.js
// Auftrag 13 (Stufe B): Anzeigetexte des Modus „Licht aus“ aus den Datendateien – Typen (unsicherheit_typen.csv),
// Ausprägungen (unsicherheit_auspraegungen.csv) und Methodenhinweise (methodenhinweise.csv). Einmal geladen, danach
// über die synchronen Abfragen erreichbar. Fehlt eine Datei, bleiben die Listen leer: Die Leiste zeigt dann nur
// „Alle“, die Detailansicht nennt die Rohwerte (typ/auspraegung), nichts bricht ab.
import { ladeCSV } from './dataLoader.js';

const ORDNER = 'data/';
let versprechen = null;
let stand = { typen: [], auspraegungen: [], hinweise: [] };

const nachReihenfolge = (a, b) => (Number(a.reihenfolge) || 0) - (Number(b.reihenfolge) || 0);
const liesOderLeer = (pfad) => ladeCSV(pfad).then((r) => r.records).catch(() => []);

export function ladeUnsicherheitVokabular() {
  if (!versprechen) {
    versprechen = Promise.all([
      liesOderLeer(`${ORDNER}unsicherheit_typen.csv`),
      liesOderLeer(`${ORDNER}unsicherheit_auspraegungen.csv`),
      liesOderLeer(`${ORDNER}methodenhinweise.csv`)
    ]).then(([typen, auspraegungen, hinweise]) => {
      stand = {
        typen: typen.filter((t) => t.typ_id).sort(nachReihenfolge),
        auspraegungen: auspraegungen.filter((a) => a.auspraegung_id).sort(nachReihenfolge),
        hinweise: hinweise.filter((h) => h.id && h.text)
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
