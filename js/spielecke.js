"use strict";
/* =====================================================================
   SPIELE-ECKE: Chips verzocken. Reines Vergnügen, kein Lernen.

   Gewinne und Verluste zählen auch für die Rangliste (G.verdient):
   Ein Gewinn hebt den Wert dort, ein Verlust senkt ihn. Einkaufen im
   Kleiderschrank ändert ihn weiterhin nicht.

   BLACKJACK  läuft ganz im Browser. Regeln in BJ.
   WETTEN     legt der Admin an (Frage, Antworten mit Quote). Alle setzen Chips,
              der Admin schließt die Wette und trägt ein, was eingetreten ist.
              Wetten und Einsätze liegen beim selben Dienst wie die Rangliste
              (firebase-regeln.json). Admin ist, wessen Kennung in konfig.js
              und in den Regeln steht.
   ===================================================================== */

const BJ = {einsaetze:[50, 100, 250, 500, 1000], blackjackZahlt:1.5, bankZiehtBis:16};
let bj = null;                                                    // die laufende Hand
const bjKarte = () => ({wert:"A23456789TJQK"[zufall(0, 12)], farbe:"♠♥♦♣"[zufall(0, 3)]});
function bjSumme(hand){ let s = 0, asse = 0; for (const k of hand){ if (k.wert === "A"){ asse++; s += 11; } else s += "TJQK".includes(k.wert) ? 10 : +k.wert; } while (s > 21 && asse--) s -= 10; return s; }
const bjNatuerlich = hand => hand.length === 2 && bjSumme(hand) === 21;
function bjStart(einsatz){ if (einsatz > G.chips || einsatz <= 0) return; G.chips -= einsatz; bj = {einsatz, ich:[bjKarte(), bjKarte()], bank:[bjKarte(), bjKarte()], fertig:false, text:""}; if (bjNatuerlich(bj.ich) || bjNatuerlich(bj.bank)) bjEnde(); sichern(); }
function bjZiehen(){ if (!bj || bj.fertig) return; bj.ich.push(bjKarte()); if (bjSumme(bj.ich) >= 21) bjEnde(); }
function bjVerdoppeln(){ if (!bj || bj.fertig || bj.ich.length !== 2 || G.chips < bj.einsatz) return; G.chips -= bj.einsatz; bj.einsatz *= 2; bj.ich.push(bjKarte()); bjEnde(); }
/* Bank zieht, dann wird abgerechnet. */
function bjEnde(){
  const ich = bjSumme(bj.ich);
  if (ich <= 21 && !bjNatuerlich(bj.ich)) while (bjSumme(bj.bank) <= BJ.bankZiehtBis) bj.bank.push(bjKarte());
  const bank = bjSumme(bj.bank); let zurueck = 0;
  if (ich > 21) bj.text = "Über 21. Einsatz verloren.";
  else if (bjNatuerlich(bj.ich) && !bjNatuerlich(bj.bank)){ zurueck = Math.round(bj.einsatz * (1 + BJ.blackjackZahlt)); bj.text = "Blackjack!"; }
  else if (bank > 21 || ich > bank){ zurueck = bj.einsatz * 2; bj.text = bank > 21 ? "Die Bank hat sich überkauft. Gewonnen!" : "Gewonnen!"; }
  else if (ich === bank && bjNatuerlich(bj.ich) === bjNatuerlich(bj.bank)){ zurueck = bj.einsatz; bj.text = "Unentschieden. Einsatz zurück."; }
  else bj.text = "Die Bank gewinnt.";
  bj.gewinn = zurueck - bj.einsatz; G.chips += zurueck; G.verdient += bj.gewinn; bj.fertig = true; sichern();
}

/* ---------- Wetten: Verbindung ---------- */
const istAdmin = () => !!(RL.admin && G.konto && G.konto.uid === RL.admin);
const wettPfad = (art, rest) => RL.datenbank.replace(/\/+$/, "") + "/" + art + "/" + encodeURIComponent(RL.kurs || "kurs1") + (rest ? "/" + rest : "") + ".json";
const mitAusweis = async url => url + "?auth=" + encodeURIComponent(await kontoAusweis());
const sende = async (url, methode, daten) => anfrage(await mitAusweis(url), {method:methode, headers:{"Content-Type":"application/json"}, body:daten === undefined ? undefined : JSON.stringify(daten)});
async function wettenLaden(){ const roh = await anfrage(wettPfad("wetten")) || {}; return Object.keys(roh).map(id => Object.assign({id}, roh[id], {optionen:Object.values(roh[id].optionen || {})})).sort((a, b) => (b.erstellt || 0) - (a.erstellt || 0)); }
/* Einsatz abgeben. Der Dienst lehnt ab, wenn die Wette zu ist oder du schon gesetzt hast. */
async function wetteSetzen(wette, option, betrag){
  if (betrag <= 0 || betrag > G.chips || G.wetten[wette.id]) return false;
  await kontoAusweis();
  await sende(wettPfad("einsaetze", wette.id + "/" + G.konto.uid), "PUT", {option, betrag, name:G.name || "?"});
  G.chips -= betrag; G.verdient -= betrag; G.wetten[wette.id] = {option, betrag, frage:wette.frage}; sichern(); return true;
}
/* Rechnet entschiedene oder gelöschte Wetten ab, auf die du gesetzt hast. Gibt Meldungen zurück. */
function wettenAbrechnen(wetten){
  const meldungen = [];
  for (const id of Object.keys(G.wetten)){ const mein = G.wetten[id], w = wetten.find(x => x.id === id); if (mein.fertig) continue;
    if (!w){ G.chips += mein.betrag; G.verdient += mein.betrag; mein.fertig = true; meldungen.push("Wette gestrichen: " + zahl(mein.betrag) + " Chips zurück."); }
    else if (w.status === "entschieden"){ mein.fertig = true; const quote = +(w.optionen[mein.option] || {}).quote || 1;
      if (w.gewinner === mein.option){ const g = Math.round(mein.betrag * quote); G.chips += g; G.verdient += g; mein.gewinn = g; meldungen.push("Wette gewonnen: +" + zahl(g) + " Chips."); } else { mein.gewinn = 0; meldungen.push("Wette verloren: " + w.frage); } } }
  if (meldungen.length){ sichern(); ranglisteMeldenLeise(); } return meldungen;
}

/* ---------- Ansicht ---------- */
function spielecke(){
  beginne("spielecke"); tagPruefen();
  const tisch = h("section", {class:"karte bjtisch"}), wettBox = h("div", {class:"wettbox"});
  rahmen("heim", h("div", {class:"ladenkopf"}, h("button", {class:"knopf klein", type:"button", onclick:heim}, "Zurück"), h("h1", {class:"seitentitel"}, "Spiele-Ecke")),
    h("p", {class:"einstieg"}, "Hier setzt du Chips aufs Spiel. Gewinne und Verluste zählen auch in der Rangliste."), tisch, h("h2", {class:"abschnitt"}, "Wetten"), wettBox);
  const karte = (k, verdeckt) => h("span", {class:"spielkarte" + (verdeckt ? " verdeckt" : "") + (!verdeckt && "♥♦".includes(k.farbe) ? " rot" : "")}, verdeckt ? "" : (k.wert === "T" ? "10" : k.wert) + k.farbe);
  const maleTisch = () => {
    const kopf = h("h2", null, "Blackjack");
    if (!bj || bj.fertig){
      tisch.replaceChildren(...[kopf, bj ? h("div", {class:"bjhaende"}, h("p", null, "Bank: " + bjSumme(bj.bank)), h("div", {class:"hand"}, bj.bank.map(k => karte(k))), h("p", null, "Du: " + bjSumme(bj.ich)), h("div", {class:"hand"}, bj.ich.map(k => karte(k))),
          h("p", {class:"bjurteil " + (bj.gewinn > 0 ? "gut" : bj.gewinn < 0 ? "schlecht" : ""), role:"status"}, bj.text + (bj.gewinn ? " " + (bj.gewinn > 0 ? "+" : "−") + zahl(Math.abs(bj.gewinn)) + " Chips" : ""))) : h("p", {class:"leise"}, "Näher an 21 als die Bank, ohne zu überkaufen. Die Bank zieht bis 16. Ein Blackjack zahlt das 1,5-Fache."),
        h("p", {class:"leise klein"}, "Dein Einsatz:"), h("div", {class:"aktionen"}, BJ.einsaetze.map(e => h("button", {class:"knopf gelb", type:"button", disabled:e > G.chips, onclick:() => { bjStart(e); ton("klick"); maleTisch(); puls(); }}, symbol("daten"), zahl(e))))].filter(Boolean));
    } else tisch.replaceChildren(kopf, h("div", {class:"bjhaende"}, h("p", null, "Bank"), h("div", {class:"hand"}, karte(bj.bank[0]), karte(null, true)), h("p", null, "Du: " + bjSumme(bj.ich) + " (Einsatz " + zahl(bj.einsatz) + ")"), h("div", {class:"hand"}, bj.ich.map(k => karte(k)))),
      h("div", {class:"aktionen"}, h("button", {class:"knopf haupt", type:"button", onclick:() => { bjZiehen(); maleTisch(); puls(); }}, "Karte"), h("button", {class:"knopf", type:"button", onclick:() => { bjEnde(); maleTisch(); puls(); }}, "Halten"),
        h("button", {class:"knopf", type:"button", disabled:bj.ich.length !== 2 || G.chips < bj.einsatz, onclick:() => { bjVerdoppeln(); maleTisch(); puls(); }}, "Verdoppeln")));
    if (bj && bj.fertig && bj.gewinn !== undefined && !bj.gemeldet){ bj.gemeldet = true; ton(bj.gewinn > 0 ? "muenze" : bj.gewinn < 0 ? "falsch" : "klick"); }
  };
  maleTisch();
  /* Wetten */
  if (!ranglisteAn()){ wettBox.append(h("section", {class:"karte"}, h("p", null, "Wetten brauchen die gemeinsame Rangliste. Sie ist auf dieser Seite noch nicht eingerichtet."))); return; }
  if (!G.name){ wettBox.append(h("section", {class:"karte"}, h("p", null, "Zum Wetten brauchst du einen Spielernamen."), h("button", {class:"knopf gelb", type:"button", onclick:rangliste}, "Namen wählen"))); return; }
  const stand = h("p", {class:"einstieg", role:"status"}, "Lade Wetten …");
  const lade = async () => {
    try {
      await kontoAusweis();                                                    // legt beim ersten Mal das namenlose Konto an; an seiner Kennung hängt, wer Admin ist
      const wetten = await wettenLaden(); if (!wettBox.isConnected) return;
      const meldungen = wettenAbrechnen(wetten); puls();
      const summen = {}; if (istAdmin()) for (const w of wetten){ const e = await anfrage(wettPfad("einsaetze", w.id)).catch(() => null) || {}; summen[w.id] = w.optionen.map((o, i) => Object.values(e).filter(x => x.option === i).reduce((n, x) => n + x.betrag, 0)); }
      if (!wettBox.isConnected) return;
      wettBox.replaceChildren(...[meldungen.length ? h("section", {class:"karte wettmeldung", role:"status"}, meldungen.map(m => h("p", null, m))) : null,
        wetten.length ? null : h("p", {class:"einstieg"}, "Gerade läuft keine Wette."), ...wetten.map(w => wettKarte(w, summen[w.id])), istAdmin() ? adminKarte() : null,
        h("p", {class:"einstieg klein"}, "Deine Kennung: " + (G.konto ? G.konto.uid : "noch keine"))].filter(Boolean));
    } catch (e) { if (wettBox.isConnected) wettBox.replaceChildren(h("p", {class:"einstieg", role:"status"}, "Die Wetten sind gerade nicht erreichbar. ", h("button", {class:"textknopf", type:"button", onclick:lade}, "Noch einmal versuchen"))); }
  };
  const wettKarte = (w, summe) => {
    const mein = G.wetten[w.id], offen = w.status === "offen", fehler = h("p", {class:"leise klein", role:"status"});
    const betrag = h("input", {class:"namensfeld betrag", type:"number", min:"1", max:String(G.chips), value:String(Math.min(100, G.chips)), "aria-label":"Einsatz in Chips"});
    const zeilen = w.optionen.map((o, i) => h("li", {class:"wettoption" + (w.status === "entschieden" && w.gewinner === i ? " gewinner" : "") + (mein && mein.option === i ? " meine" : "")},
      h("span", null, h("b", null, o.text), h("span", {class:"leise klein"}, "Quote " + komma(o.quote) + (summe ? ", gesetzt: " + zahl(summe[i]) : ""))),
      offen && !mein ? h("button", {class:"knopf gelb klein", type:"button", onclick:async () => { const n = Math.floor(+betrag.value);
        if (!(n > 0) || n > G.chips){ fehler.textContent = "Der Einsatz muss zwischen 1 und " + zahl(G.chips) + " Chips liegen."; return; }
        try { await wetteSetzen(w, i, n); ton("muenze"); lade(); } catch (e) { fehler.textContent = "Der Einsatz wurde nicht angenommen. Vielleicht ist die Wette schon geschlossen."; } }}, "Setzen") : null,
      istAdmin() && w.status !== "entschieden" ? h("button", {class:"knopf klein", type:"button", onclick:async () => { await sende(wettPfad("wetten", w.id), "PATCH", {status:"entschieden", gewinner:i}); lade(); }}, "Eingetreten") : null));
    return h("section", {class:"karte wette"}, h("p", {class:"leise"}, offen ? "Offen" : w.status === "zu" ? "Geschlossen, Ergebnis steht aus" : "Entschieden"), h("h2", null, w.frage),
      mein ? h("p", {class:"leise klein"}, "Dein Einsatz: " + zahl(mein.betrag) + " Chips auf „" + ((w.optionen[mein.option] || {}).text || "?") + "“" + (mein.fertig ? (mein.gewinn ? ". Gewonnen: " + zahl(mein.gewinn) : ". Verloren") : "") + ".") : offen ? h("div", {class:"antwort"}, h("label", null, "Einsatz ", betrag)) : null,
      h("ul", {class:"wettoptionen"}, zeilen), fehler,
      istAdmin() ? h("div", {class:"aktionen"}, offen ? h("button", {class:"knopf klein", type:"button", onclick:async () => { await sende(wettPfad("wetten", w.id), "PATCH", {status:"zu"}); lade(); }}, "Schließen") : null,
        h("button", {class:"knopf klein", type:"button", onclick:async () => { await sende(wettPfad("wetten", w.id), "DELETE"); lade(); }}, "Löschen (Einsätze zurück)")) : null);
  };
  const adminKarte = () => {
    const frage = h("input", {class:"namensfeld", type:"text", maxlength:"120", "aria-label":"Frage der Wette"}), opt = h("textarea", {class:"freitext", rows:"3", "aria-label":"Antworten, eine pro Zeile, mit Quote"}), fehler = h("p", {class:"leise klein", role:"status"});
    opt.value = "Ja; 2\nNein; 2";
    return h("form", {class:"karte", onsubmit:async e => { e.preventDefault();
        const optionen = opt.value.split("\n").map(z => z.split(";")).filter(z => z[0].trim()).map(z => ({text:z[0].trim().slice(0, 60), quote:Math.max(1.01, Math.min(50, parseFloat(String(z[1] || "2").replace(",", ".")) || 2))}));
        if (!frage.value.trim() || optionen.length < 2 || optionen.length > 6){ fehler.textContent = "Es braucht eine Frage und 2 bis 6 Antworten."; return; }
        try { await sende(wettPfad("wetten"), "POST", {frage:frage.value.trim(), optionen, status:"offen", erstellt:Date.now()}); lade(); } catch (err) { fehler.textContent = "Das Anlegen wurde abgelehnt. Steht deine Kennung in den Firebase-Regeln?"; } }},
      h("p", {class:"leise"}, "Nur für dich als Admin"), h("h2", null, "Neue Wette"), h("label", null, "Frage", frage), h("label", null, "Antworten: eine pro Zeile, dahinter nach einem Strichpunkt die Quote", opt), fehler, h("button", {class:"knopf haupt", type:"submit"}, "Wette anlegen"));
  };
  wettBox.append(stand); lade();
}
