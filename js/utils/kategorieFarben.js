// js/utils/kategorieFarben.js
// Gemeinsame Kategorie-Farblogik für alle Bestandsverzeichnis-Visualisierungen,
// die nach bkk_kategorie/bkk_unterkategorie einfärben (aktuell treemap.js und
// sunburst.js). Ursprünglich lokal in treemap.js entstanden (siehe CHANGELOG,
// Etappe "Bestandsverzeichnis-Treemap: Überarbeitung") und bei der
// Sunburst-Überarbeitung hierher ausgelagert, um Duplikation zu vermeiden -
// exakt dieselbe Wartungsgefahr, vor der bestandsHierarchie.js bereits stand,
// bevor mindestgroesse dort parametrisiert wurde. Reine Verschiebung, keine
// Verhaltensänderung (per Test gegen die Treemap verifiziert, siehe CHANGELOG).
//
// js/config/constants.js' CAT_COLORS ist NICHT hierfür gedacht (Platzhalter für
// urkunden.csv's "kategorien"-Spalte, keine bkk_kategorie-Werte) - deshalb
// eigenständige, hier zentrale Farblogik.

function relativeLuminanz(hex) {
  const kanal = (wert) => {
    const c = wert / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * kanal(parseInt(hex.slice(1, 3), 16))
    + 0.7152 * kanal(parseInt(hex.slice(3, 5), 16))
    + 0.0722 * kanal(parseInt(hex.slice(5, 7), 16));
}

export function wcagKontrast(hex1, hex2) {
  const l1 = relativeLuminanz(hex1);
  const l2 = relativeLuminanz(hex2);
  const [heller, dunkler] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (heller + 0.05) / (dunkler + 0.05);
}

// Wählt zwischen Schwarz/Weiß die Textfarbe mit dem höheren WCAG-Kontrast zum
// Hintergrund (echte WCAG-Formel, nicht nur eine Helligkeits-Schwelle) -
// garantiert mind. 4,5:1 für jede tatsächlich vorkommende Hintergrundfarbe
// (siehe Kontrastprüfung im Test/CHANGELOG).
export function passendeTextfarbe(hintergrundHex) {
  const kontrastSchwarz = wcagKontrast(hintergrundHex, '#1a1a1a');
  const kontrastWeiss = wcagKontrast(hintergrundHex, '#ffffff');
  return kontrastSchwarz >= kontrastWeiss ? '#1a1a1a' : '#ffffff';
}

// Sicherheitsnetz statt bloßer Annahme: bei manchen Farbtönen (v.a. Blau/Violett,
// die in der WCAG-Formel wegen des geringen Blau-Gewichts (0,0722) dunkler wirken
// als ihre HSL-Helligkeit vermuten lässt) erreicht bei ungünstiger Verschiebung
// (Unterkategorie-Aufhellung/Abdunklung) WEDER Schwarz noch Weiß volle 4,5:1.
// Verschiebt die Helligkeit in kleinen Schritten Richtung des jeweils passenderen
// Extrems, bis eine Textfarbe die Anforderung erfüllt - garantiert das
// Akzeptanzkriterium für JEDE tatsächlich erzeugte Farbe, statt es nur zu
// erhoffen (per Test verifiziert, siehe CHANGELOG).
export function garantiereKontrast(hex) {
  const farbe = d3.hsl(hex);
  for (let versuch = 0; versuch < 25; versuch += 1) {
    const kontrastSchwarz = wcagKontrast(farbe.formatHex(), '#1a1a1a');
    const kontrastWeiss = wcagKontrast(farbe.formatHex(), '#ffffff');
    if (Math.max(kontrastSchwarz, kontrastWeiss) >= 4.5) return farbe.formatHex();
    farbe.l = kontrastSchwarz > kontrastWeiss ? Math.max(0, farbe.l - 0.04) : Math.min(1, farbe.l + 0.04);
  }
  return farbe.formatHex();
}

// Kategoriale Farbskala: Farbton gleichmäßig über den vollen Farbkreis verteilt
// (nicht auf Rot/Grün beschränkt) UND Helligkeit zwischen zwei Stufen wechselnd -
// letzteres sorgt dafür, dass benachbarte Kategorien sich auch bei
// Graustufen-/Farbfehlsichtigkeits-Simulation noch unterscheiden (reine
// Farbton-Variation bei gleicher Helligkeit würde dort kollabieren).
// "ohne Kategorie" ist bewusst NICHT Teil dieser Skala, siehe OHNE_KATEGORIE_FARBE.
export function baueKategorieFarbSkala(kategorienNamen) {
  const n = kategorienNamen.length;
  const farben = kategorienNamen.map((name, i) => {
    const farbton = (i * 360) / n;
    const helligkeit = i % 2 === 0 ? 0.36 : 0.62;
    return garantiereKontrast(d3.hsl(farbton, 0.62, helligkeit).formatHex());
  });
  return d3.scaleOrdinal().domain(kategorienNamen).range(farben);
}

export const OHNE_KATEGORIE_FARBE = '#8a8a8a';

// Abstufung der Kategorie-Grundfarbe je Unterkategorie (Helligkeitsvariation
// derselben Farbe) - Bestände derselben Unterkategorie teilen sich denselben Ton,
// unterschiedliche Unterkategorien derselben Kategorie sind sichtbar
// unterscheidbar, bleiben aber erkennbar "verwandt" (gleicher Farbton).
const HELLIGKEITS_STUFEN = [0, 0.7, -0.5, 1.3, -0.8, 0.35];
export function farbeFuerUnterkategorie(basisFarbeHex, unterkategorieKnoten) {
  const geschwister = unterkategorieKnoten.parent.children;
  const index = geschwister.indexOf(unterkategorieKnoten);
  const faktor = HELLIGKEITS_STUFEN[index % HELLIGKEITS_STUFEN.length];
  const farbe = d3.rgb(basisFarbeHex);
  const verschoben = (faktor >= 0 ? farbe.brighter(faktor) : farbe.darker(-faktor)).formatHex();
  return garantiereKontrast(verschoben);
}
