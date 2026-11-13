"use strict";
/* =====================================================================
   ANREIZE: alles, was zum Wiederkommen motiviert. Reine Buchführung,
   die Anzeige macht spiel.js.
     - Erfahrung und Rang: jede richtige Antwort zählt.
     - Tagesserie: ein Tag zählt, sobald eine Runde gespielt ist.
       Ein Serienschutz fängt einen verpassten Tag auf.
     - Tagesziel und drei Tagesaufträge.
     - Truhen mit zufälligem Inhalt nach jedem Sieg und einmal pro Tag.
     - Abzeichen für Meilensteine.
   ===================================================================== */

const RAENGE = [[1, "Bit"], [2, "Nibble"], [3, "Byte"], [5, "Kilobyte"], [8, "Megabyte"], [12, "Gigabyte"], [16, "Terabyte"], [20, "Petabyte"], [25, "Exabyte"]];
const xpFuerAufstieg = stufe => 100 + (stufe - 1) * 60;
function rang(){
  let rest = G.xp, stufe = 1;
  while (rest >= xpFuerAufstieg(stufe)){ rest -= xpFuerAufstieg(stufe); stufe++; }
  return {stufe, rest, noetig:xpFuerAufstieg(stufe), name:RAENGE.filter(r => stufe >= r[0]).pop()[1]};
}

/* Was gefeiert werden soll, sammelt sich hier; spiel.js zeigt es an. */
const FEIERN = [];
function gibXp(n){
  const vorher = rang().stufe; G.xp += n; const r = rang();
  if (r.stufe > vorher){ const chips = 100 * r.stufe; gibChips(chips); FEIERN.push({art:"aufstieg", text:"Rang " + r.stufe + ": " + r.name, mehr:"+" + zahl(chips) + " Chips"}); }
}

/* Neuer Tag? Dann Serie prüfen und Tageszähler zurücksetzen. */
function tagPruefen(){
  const heute = heuteNr(); if (G.tag && G.tag.nr === heute) return;
  const s = G.serie;
  if (s.letzter != null && heute - s.letzter > 1 && s.tage > 0){
    const verpasst = heute - s.letzter - 1;
    if (verpasst <= s.schutz){ s.schutz -= verpasst; s.letzter = heute - 1; FEIERN.push({art:"schutz", text:"Serienschutz eingesetzt", mehr:"Deine Serie von " + s.tage + " Tagen bleibt"}); }
    else { FEIERN.push({art:"serieWeg", text:"Serie gerissen", mehr:"Nach " + s.tage + " Tagen. Heute beginnt eine neue"}); s.tage = 0; }
  }
  const gab = KAPITEL.some(k => k.aufgaben.some(istFaellig)), wuerfel = zufallMitSaat(heute * 7919), liste = AUFTRAEGE.filter(a => gab || a.id !== "faellig"), auftraege = [];
  while (auftraege.length < 3) auftraege.push(liste.splice(Math.floor(wuerfel() * liste.length), 1)[0].id);
  G.tag = {nr:heute, richtig:0, runden:0, siege:0, serieMax:0, faellig:0, erklaert:0, abwehr:0, truhe:false, ziel:false, bonus:false, auftraege, geholt:{}};
}
/* Nach jeder gespielten Runde (Angriff oder Abwehr). */
/* Chips gutschreiben. "verdient" ist der Wert für die Rangliste: alles, was je dazukam, samt Gewinnen und Verlusten aus der Spiele-Ecke. Einkaufen senkt ihn nicht. */
function gibChips(n){ G.chips += n; G.verdient += n; }
function rundeGespielt(){
  tagPruefen(); G.tag.runden++; const s = G.serie, heute = heuteNr();
  if (s.letzter === heute) return;
  s.tage++; s.letzter = heute; s.rekord = Math.max(s.rekord, s.tage);
  FEIERN.push({art:"serie", text:s.tage === 1 ? "Serie gestartet" : s.tage + " Tage in Folge", mehr:"Komm morgen wieder, damit sie hält"});
  if (s.tage % 5 === 0 && s.schutz < 2){ s.schutz++; FEIERN.push({art:"schutz", text:"Serienschutz erhalten", mehr:"Er fängt einen verpassten Tag auf"}); }
}
/* Nach jeder richtigen Antwort. */
function richtigGezaehlt(a, warFaellig, serie){
  tagPruefen(); const t = G.tag; t.richtig++; G.zaehler.richtig++;
  if (warFaellig) t.faellig++; if (a.typ === "erklaeren") t.erklaert++; t.serieMax = Math.max(t.serieMax, serie);
  if (!t.ziel && t.richtig >= REGELN.tagesziel){ t.ziel = true; gibChips(REGELN.tageszielLohn); FEIERN.push({art:"ziel", text:"Tagesziel geschafft", mehr:"+" + REGELN.tageszielLohn + " Chips"}); }
}

/* Tagesaufträge: jeden Tag drei aus dieser Liste. */
const AUFTRAEGE = [
  {id:"runden",   text:"Spiele 3 Runden",                              ziel:3,  wert:t => t.runden},
  {id:"richtig",  text:"Beantworte 15 Fragen richtig",                 ziel:15, wert:t => t.richtig},
  {id:"siege",    text:"Gewinne 2 Angriffe",                           ziel:2,  wert:t => t.siege},
  {id:"serie",    text:"Schaffe 5 richtige Antworten in Folge",        ziel:5,  wert:t => t.serieMax},
  {id:"faellig",  text:"Beantworte 6 fällige Wiederholungen richtig",  ziel:6,  wert:t => t.faellig},
  {id:"erklaert", text:"Löse 2 Erklär-Aufgaben",                       ziel:2,  wert:t => t.erklaert},
  {id:"abwehr",   text:"Spiele eine Runde Wiederholen",                 ziel:1,  wert:t => t.abwehr}
];
function tagesAuftraege(){ tagPruefen(); return G.tag.auftraege.map(id => { const a = AUFTRAEGE.find(x => x.id === id), ist = Math.min(a.ziel, a.wert(G.tag)); return {id, text:a.text, ziel:a.ziel, ist, fertig:ist >= a.ziel, geholt:!!G.tag.geholt[id]}; }); }
function auftragAbholen(id){
  const a = tagesAuftraege().find(x => x.id === id); if (!a || !a.fertig || a.geholt) return false;
  G.tag.geholt[id] = true; gibChips(REGELN.auftragLohn); gibXp(30); return true;
}
const alleAuftraegeGeholt = () => tagesAuftraege().every(a => a.geholt);

/* Truhen: der Inhalt ist Zufall, die Art auch. */
const TRUHEN = {holz:{name:"Holztruhe", chips:[40, 80], xp:0}, silber:{name:"Silbertruhe", chips:[100, 160], xp:20}, gold:{name:"Goldtruhe", chips:[250, 400], xp:50}};
function truheWuerfeln(){ const z = Math.random(); return z < .1 ? "gold" : z < .4 ? "silber" : "holz"; }
function truheOeffnen(art, faktor){
  const t = TRUHEN[art], chips = zufall(t.chips[0], t.chips[1]) * faktor, schutz = art === "gold" && G.serie.schutz < 2 ? 1 : 0;
  gibChips(chips); G.serie.schutz += schutz; if (t.xp) gibXp(t.xp);
  return {name:t.name, chips, xp:t.xp, schutz};
}

/* Wochen beginnen am Montag (für die Goldtruhe des Klausur-Bosses). */
const wocheNr = () => Math.floor((heuteNr() + 3) / 7);

/* Abzeichen. */
const ABZEICHEN = [
  {id:"sieg1",      name:"Erster Sieg",        text:"Gewinne einen Angriff.",                           ok:() => G.zaehler.siege >= 1},
  {id:"perfekt",    name:"Fehlerfrei",         text:"Beantworte in einem Angriff alle Fragen richtig.", ok:() => G.zaehler.perfekt >= 1},
  {id:"sterne8",    name:"Acht Sterne",        text:"Sammle 8 Sterne.",                                 ok:() => sterneGesamt() >= 8},
  {id:"sterneAlle", name:"Sternenhimmel",      text:"Hole alle Sterne eines Themas.",                  ok:() => THEMEN.some(s => s.kapitel.every(k => (G.sterne[k.id] || 0) >= 3))},
  {id:"serie3",     name:"Drei am Stück",      text:"Lerne an 3 Tagen in Folge.",                       ok:() => G.serie.rekord >= 3},
  {id:"serie7",     name:"Eine Woche",         text:"Lerne an 7 Tagen in Folge.",                       ok:() => G.serie.rekord >= 7},
  {id:"richtig100", name:"Hundert richtig",    text:"Beantworte 100 Fragen richtig.",                   ok:() => G.zaehler.richtig >= 100},
  {id:"richtig500", name:"Fünfhundert richtig",text:"Beantworte 500 Fragen richtig.",                   ok:() => G.zaehler.richtig >= 500},
  {id:"fest1",      name:"Kapitel sitzt",      text:"Bringe alle Aufgaben eines Kapitels auf klausurfest.", ok:() => KAPITEL.some(k => k.aufgaben.every(istFest))},
  {id:"festAlle",   name:"Klausurreif",        text:"Bringe alle Aufgaben eines Themas auf klausurfest.", ok:() => THEMEN.some(s => s.kapitel.every(k => k.aufgaben.every(istFest)))},
  {id:"schrank5",   name:"Modebewusst",        text:"Kaufe 5 Teile für deine Figur.",                   ok:() => gekaufteTeile().length >= 5},
  {id:"abwehr10",   name:"Dranbleiber",         text:"Spiele 10 Runden Wiederholen.",                   ok:() => G.zaehler.abwehr >= 10},
  {id:"boss",       name:"Boss besiegt",       text:"Besiege einen Klausur-Boss.",                      ok:() => G.zaehler.boss >= 1},
  {id:"schrank25",  name:"Voller Schrank",     text:"Kaufe 25 Teile für deine Figur.",                  ok:() => gekaufteTeile().length >= 25},
  {id:"luxus",      name:"Luxus",              text:"Kaufe ein legendäres Teil.",                       ok:() => gekaufteTeile().some(id => TEIL[id].selten === 3)}
];
function abzeichenPruefen(){
  for (const a of ABZEICHEN) if (!G.abzeichen[a.id] && a.ok()){ G.abzeichen[a.id] = heuteNr(); FEIERN.push({art:"abzeichen", text:"Abzeichen: " + a.name, mehr:a.text}); gibXp(40); }
}
