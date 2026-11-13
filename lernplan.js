"use strict";
/* =====================================================================
   LERNPLAN: wann welche Aufgabe wieder drankommt.
   Umgesetzt sind die beiden Lerntechniken mit dem besten Nachweis:
   sich selbst abfragen und das Abfragen über mehrere Tage verteilen.

     - Jede Aufgabe liegt in einem Kasten 0 bis 5. Richtig beantwortet
       wandert sie einen Kasten weiter, aber höchstens einmal pro Tag.
       Falsch beantwortet fällt sie zurück in Kasten 0.
     - Der Kasten bestimmt, in wie vielen Tagen sie wieder fällig ist.
     - Klausurfest ist eine Aufgabe ab Kasten 3: an drei verschiedenen
       Tagen richtig abgerufen.
     - Das Spiel wählt die Aufgaben aus, nicht du: zuerst Fälliges,
       dann Neues, dann der Rest.
   ===================================================================== */

const ABSTAND_TAGE = [0, 1, 3, 7, 14, 30];        // je Kasten: Tage bis zur nächsten Abfrage
const KLAUSURFEST_AB = 3;
/* Wie viel eigenes Abrufen ein Aufgabentyp verlangt: 1 = wiedererkennen, 3 = frei abrufen. */
const ANSPRUCH = {wahl:1, wahrfalsch:1, gruppen:2, paare:2, reihenfolge:2, tabelle:2, schema:2, luecke:3, eingabe:3, schalter:3, rechnen:3, erklaeren:3};

const heuteNr = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
const istNeu = a => !G.lern[a.id];
const istFaellig = a => { const s = G.lern[a.id]; return !!s && s.f <= heuteNr(); };       // schon gesehen und wieder dran
const istFest = a => { const s = G.lern[a.id]; return !!s && s.k >= KLAUSURFEST_AB; };

/* Eine Antwort verbuchen. Gibt zurück, ob die Aufgabe eine fällige Wiederholung war. */
function verbuche(a, richtig, zweiteChance){
  const heute = heuteNr(), warFaellig = istFaellig(a), s = G.lern[a.id] || (G.lern[a.id] = {k:0, f:heute, t:-1});
  if (!richtig){ s.k = 0; s.f = heute; }                                   // zurück auf Anfang, heute noch einmal
  else if (zweiteChance){ s.f = heute + 1; }                               // im selben Durchgang nachgelernt: morgen wieder
  else if (s.t !== heute || s.k === 0){ s.k = Math.min(5, s.k + 1); s.f = heute + ABSTAND_TAGE[s.k]; }
  s.t = heute;
  return warFaellig;
}

/* Aufgaben für eine Runde. Reihenfolge der Auswahl: Fälliges, dann Neues, dann der Rest.
   stufe 1: alle Typen. stufe 2: keine reinen Wiedererkennungs-Aufgaben.
   stufe 3: zwei Drittel der Aufgaben verlangen freies Abrufen (vier von sechs, im Boss sieben von zehn). */
function waehleAufgaben(pool, n, stufe){
  const rang = a => istFaellig(a) ? 0 : istNeu(a) ? 1 : 2;
  const ordne = l => mischen(l).sort((a, b) => rang(a) - rang(b));
  const ab = min => ordne(pool.filter(a => ANSPRUCH[a.typ] >= min));
  const reihen = stufe === 3 ? [[ab(3), Math.round(n * 2 / 3)], [ab(2), n]] : stufe === 2 ? [[ab(2), n]] : [];
  reihen.push([ordne(pool), n]);                                         // Auffangnetz: alles
  const hoechstensOffen = stufe === 1 ? 1 : Math.round(n / 3), runde = []; let offen = 0;      // offene Erklär-Aufgaben dosieren
  for (const [liste, bis] of reihen) for (const a of liste){
    if (runde.length >= Math.min(bis, n)) break;
    if (runde.includes(a)) continue;
    if (a.typ === "erklaeren"){ if (offen >= hoechstensOffen) continue; offen++; }
    runde.push(a);
  }
  const alle = ordne(pool); for (let i = 0; runde.length < n; i++) runde.push(alle[i % alle.length]);     // sehr kleine Auswahl: auffüllen
  return mischen(runde);
}

/* Auswertung für die Fortschrittsanzeige. */
function lernstand(aufgaben){
  const fest = aufgaben.filter(istFest).length, neu = aufgaben.filter(istNeu).length;
  return {gesamt:aufgaben.length, fest, neu, inArbeit:aufgaben.length - fest - neu, faellig:aufgaben.filter(istFaellig).length};
}
