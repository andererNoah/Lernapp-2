"use strict";
/* =====================================================================
   DUELL: 1 gegen 1, live.

   Ablauf:
     1. Jemand eröffnet ein Duell (Bereich und Einsatz) und wartet.
     2. Ein anderer nimmt es in der Liste "Offene Duelle" an. Damit läuft es.
     3. Beide bekommen dieselben Fragen und sehen den Stand des anderen live.
     4. Es gewinnt, wer mehr richtig hat. Bei Gleichstand entscheidet die kürzere Antwortzeit.

   Technik: Ein Duell ist ein Eintrag in der Datenbank (duelle/<Ort>/<Kennung>).
   Jeder schreibt nur seinen eigenen Stand (stand/<eigene Kennung>) und fragt
   den Eintrag im Takt neu ab. Wer sich 45 Sekunden nicht meldet, gilt als ausgestiegen.
   Der Einsatz wird beim Eröffnen oder Annehmen abgezogen und steht in G.duell,
   bis das Duell abgerechnet ist. Wer mittendrin geht, hat verloren.
   Erklär- und Zufallsaufgaben kommen im Duell nicht vor.
   ===================================================================== */

const DUELL = {fragen:8, einsaetze:[0, 50, 100, 250, 500], takt:1500, herzschlag:5000, stumm:45000, offenSichtbar:3 * 60000};
const duellPfad = rest => wettPfad("duelle", rest);
let D = null;                                            // das laufende Duell dieses Geräts

/* ---------- Fragen ---------- */
const duellTauglich = a => a.typ !== "erklaeren" && a.typ !== "rechnen";
function duellBereiche(){                                // wählbar: jedes Thema ganz oder ein einzelnes Kapitel
  const liste = [];
  for (const t of THEMEN){ liste.push({id:t.id, titel:t.titel + " (alles)", aufgaben:t.kapitel.flatMap(k => k.aufgaben)}); for (const k of t.kapitel) liste.push({id:k.id, titel:t.titel + ": " + k.titel, aufgaben:k.aufgaben}); }
  return liste.map(b => Object.assign(b, {aufgaben:b.aufgaben.filter(duellTauglich)})).filter(b => b.aufgaben.length >= DUELL.fragen);
}
const duellAufgaben = kennungen => (kennungen || []).map(id => ALLE_AUFGABEN.find(a => a.id === id)).filter(Boolean);

/* ---------- Verbindung ---------- */
const duellIch = () => ({uid:G.konto.uid, name:G.name || "?", figur:trachtAlsText(G.tracht)});
const duellStand = (mehr) => Object.assign({nr:D ? D.nr : 0, richtig:D ? D.richtig : 0, zeit:D ? Math.round(D.zeit * 10) / 10 : 0, puls:Date.now()}, mehr);
async function duellEroeffnen(bereich, einsatz){
  await kontoAusweis();
  const id = Array.from({length:8}, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 31)]).join("");
  const fragen = mischen(bereich.aufgaben).slice(0, DUELL.fragen).map(a => a.id);
  D = {id, einsatz, nr:0, richtig:0, zeit:0, fragen};
  await sende(duellPfad(id), "PUT", {a:duellIch(), wo:bereich.titel, fragen, einsatz, status:"offen", erstellt:Date.now(), stand:{[G.konto.uid]:duellStand()}});
  G.chips -= einsatz; G.duell = {id, einsatz}; sichern();
}
async function duellAnnehmen(d){
  await kontoAusweis();
  D = {id:d.id, einsatz:d.einsatz || 0, nr:0, richtig:0, zeit:0, fragen:d.fragen};
  await sende(duellPfad(d.id), "PATCH", {b:duellIch(), status:"laeuft", ["stand/" + G.konto.uid]:duellStand()});      // scheitert, wenn schon jemand angenommen hat
  G.chips -= D.einsatz; G.duell = {id:d.id, einsatz:D.einsatz}; sichern();
}
const duellMelden = mehr => sende(duellPfad(D.id + "/stand/" + G.konto.uid), "PUT", duellStand(mehr)).catch(() => {});
async function duelleLaden(){ const roh = await anfrage(duellPfad()) || {}; return Object.keys(roh).map(id => Object.assign({id}, roh[id])); }

/* ---------- Wertung ---------- */
/* Wer hat gewonnen? "sieg", "niederlage", "remis" aus Sicht von uid; null, solange es noch läuft. gegnerWeg: der andere meldet sich nicht mehr. */
function duellUrteil(d, uid, gegnerWeg){
  const ich = (d.stand || {})[uid], anderer = Object.entries(d.stand || {}).find(([k]) => k !== uid), er = anderer && anderer[1];
  if (ich && ich.aufgegeben) return "niederlage";
  if (er && er.aufgegeben) return "sieg";                 // gibt der andere auf, ist sofort Schluss
  if (!ich || !ich.fertig) return null;
  if (!er || !er.fertig) return gegnerWeg ? "sieg" : null;
  if (ich.richtig !== er.richtig) return ich.richtig > er.richtig ? "sieg" : "niederlage";
  return ich.zeit === er.zeit ? "remis" : ich.zeit < er.zeit ? "sieg" : "niederlage";
}
/* Rechnet den Einsatz genau einmal ab. Gewinn und Verlust zählen wie in der Spiele-Ecke auch für die Rangliste. */
function duellAbrechnen(urteil){
  const e = G.duell ? G.duell.einsatz : 0; G.duell = null;
  G.duelle = Object.assign({siege:0, niederlagen:0, remis:0}, G.duelle);
  if (urteil === "sieg"){ G.chips += 2 * e; G.verdient += e; G.duelle.siege++; }
  else if (urteil === "niederlage"){ G.verdient -= e; G.duelle.niederlagen++; }
  else if (urteil === "remis"){ G.chips += e; G.duelle.remis++; }
  else G.chips += e;                                     // gar nicht zustande gekommen: Einsatz zurück
  sichern(); if (urteil) ranglisteMeldenLeise();
  return e;
}
/* Offener Einsatz aus einer früheren Sitzung (Seite geschlossen, Absturz): jetzt abrechnen. Räumt außerdem eigene alte Einträge weg. */
async function duellAufraeumen(liste){
  const uid = G.konto && G.konto.uid; let text = "";
  if (G.duell && !(D && D.id === G.duell.id)){
    const d = liste.find(x => x.id === G.duell.id), e = G.duell.einsatz;
    if (!d || d.status === "offen"){ duellAbrechnen(null); if (e) text = "Dein letztes Duell kam nicht zustande. " + zahl(e) + " Chips zurück."; }
    else { const u = duellUrteil(d, uid, true) || "niederlage"; duellAbrechnen(u); text = u === "sieg" ? "Dein letztes Duell: gewonnen." : u === "remis" ? "Dein letztes Duell: unentschieden." : "Dein letztes Duell hast du verlassen. Das zählt als verloren."; }
  }
  for (const d of liste){ const meins = (d.a && d.a.uid === uid) || (d.b && d.b.uid === uid);
    if (meins && !(D && D.id === d.id) && (d.status !== "laeuft" || Date.now() - (d.erstellt || 0) > 3600000)) sende(duellPfad(d.id), "DELETE").catch(() => {}); }
  return text;
}

/* ---------- Ansichten ---------- */
const duellAktiv = (name, marke) => ansicht === name && D === marke;
function duellKopf(titel){ return h("div", {class:"ladenkopf"}, h("button", {class:"knopf klein", type:"button", onclick:heim}, "Zurück"), h("h1", {class:"seitentitel"}, titel)); }

function duellLobby(){
  beginne("duell"); tagPruefen(); D = null;
  if (!ranglisteAn()) return rahmen("heim", duellKopf("Duell"), h("section", {class:"karte"}, h("p", null, "Duelle brauchen die gemeinsame Rangliste. Sie ist auf dieser Seite noch nicht eingerichtet.")));
  if (!G.name) return rahmen("heim", duellKopf("Duell"), h("section", {class:"karte"}, h("p", null, "Für ein Duell brauchst du einen Spielernamen."), h("button", {class:"knopf gelb", type:"button", onclick:rangliste}, "Namen wählen")));
  const bereiche = duellBereiche(), wahl = h("select", {class:"namensfeld", "aria-label":"Bereich der Fragen"}, bereiche.map((b, i) => h("option", {value:String(i)}, b.titel)));
  const start = bereiche.findIndex(b => b.id === aktuellesThema().id); if (start >= 0) wahl.value = String(start);
  let einsatz = 0; const fehler = h("p", {class:"leise klein", role:"status"}), meldung = h("p", {class:"einstieg", role:"status"}), liste = h("div", {class:"duellliste"}, h("p", {class:"einstieg"}, "Lade offene Duelle …"));
  const knoepfe = h("div", {class:"aktionen"});
  const maleEinsatz = () => knoepfe.replaceChildren(...DUELL.einsaetze.map(e => h("button", {class:"knopf klein" + (e === einsatz ? " gelb" : ""), type:"button", "aria-pressed":String(e === einsatz), disabled:e > G.chips, onclick:() => { einsatz = e; maleEinsatz(); }}, e ? zahl(e) : "Ohne")));
  maleEinsatz();
  const bilanz = Object.assign({siege:0, niederlagen:0, remis:0}, G.duelle);
  rahmen("heim", duellKopf("Duell"),
    h("p", {class:"einstieg"}, "1 gegen 1, live: " + DUELL.fragen + " Fragen, dieselben für beide. Mehr Richtige gewinnt, bei Gleichstand die kürzere Zeit. Deine Bilanz: " + bilanz.siege + " Siege, " + bilanz.niederlagen + " Niederlagen, " + bilanz.remis + " unentschieden."), meldung,
    h("section", {class:"karte"}, h("h2", null, "Duell eröffnen"), h("label", null, "Bereich", wahl), h("p", {class:"leise klein"}, "Einsatz in Chips. Der Sieger bekommt beide Einsätze."), knoepfe, fehler,
      h("div", {class:"aktionen"}, h("button", {class:"knopf haupt", type:"button", onclick:async ev => { ev.target.disabled = true;
        try { await duellEroeffnen(bereiche[+wahl.value], einsatz); duellWarten(); } catch (e) { D = null; ev.target.disabled = false; fehler.textContent = "Das Duell konnte nicht angelegt werden. Sind die Firebase-Regeln für Duelle eingetragen?"; } }}, "Eröffnen und warten"))),
    h("h2", {class:"abschnitt"}, "Offene Duelle"), liste);
  let erstesMal = true;
  const lade = async () => {
    if (ansicht !== "duell" || D) return;
    try {
      if (erstesMal) await kontoAusweis();
      const alle = await duelleLaden(); if (ansicht !== "duell" || D) return;
      if (erstesMal){ erstesMal = false; const t = await duellAufraeumen(alle); if (t){ meldung.textContent = t; puls(); maleEinsatz(); } }
      const offen = alle.filter(d => d.status === "offen" && d.a && d.a.uid !== G.konto.uid && Math.abs(Date.now() - (((d.stand || {})[d.a.uid] || {}).puls || 0)) < DUELL.offenSichtbar && duellAufgaben(d.fragen).length === DUELL.fragen);
      liste.replaceChildren(...(offen.length ? offen.map(d => h("div", {class:"rangzeile duellzeile"}, figurBild(trachtAusText(d.a.figur), "kopf", "klein"),
        h("span", {class:"rangwer"}, h("b", null, String(d.a.name || "?").slice(0, 16)), h("span", {class:"leise klein"}, String(d.wo || "").slice(0, 60) + (d.einsatz ? ", Einsatz " + zahl(d.einsatz) : ", ohne Einsatz"))),
        h("button", {class:"knopf gelb klein", type:"button", disabled:(d.einsatz || 0) > G.chips, onclick:async ev => { ev.target.disabled = true;
          try { await duellAnnehmen(d); duellSpiel(Object.assign({}, d, {b:duellIch(), status:"laeuft"})); } catch (e) { D = null; fehler.textContent = "Dieses Duell hat gerade schon jemand angenommen."; lade(); } }}, "Annehmen")))
        : [h("p", {class:"einstieg"}, "Gerade wartet niemand. Eröffne selbst ein Duell und sag im Kurs Bescheid.")]));
    } catch (e) { liste.replaceChildren(h("p", {class:"einstieg", role:"status"}, "Die Duelle sind gerade nicht erreichbar.")); }
    setTimeout(lade, 3000);
  };
  lade();
}

function duellWarten(){
  beginne("duellwarten"); const marke = D;
  rahmen("heim", h("section", {class:"karte duellwarten"}, figurBild(G.tracht, "kopf", "gross"), h("h2", null, "Warte auf einen Gegner …"),
    h("p", null, "Dein Duell steht jetzt bei allen in der Liste „Offene Duelle“. Bleib auf dieser Seite, es geht von selbst los."),
    h("button", {class:"knopf", type:"button", onclick:async () => { D = null; await sende(duellPfad(marke.id), "DELETE").catch(() => {}); duellAbrechnen(null); duellLobby(); }}, "Abbrechen")));
  let zuletzt = Date.now();
  const takt = async () => {
    if (!duellAktiv("duellwarten", marke)) return;
    try {
      const d = await anfrage(duellPfad(marke.id)); if (!duellAktiv("duellwarten", marke)) return;
      if (d && d.status === "laeuft" && d.b) return duellSpiel(Object.assign({id:marke.id}, d));
      if (Date.now() - zuletzt > DUELL.herzschlag){ zuletzt = Date.now(); duellMelden(); }
    } catch (e) {}
    setTimeout(takt, DUELL.takt);
  };
  takt();
}

function duellSpiel(d){
  beginne("duellspiel"); const marke = D, ich = G.konto.uid, gegner = d.a.uid === ich ? d.b : d.a, aufgaben = duellAufgaben(d.fragen);
  let daten = d, gegnerPuls = null, gegnerNeu = Date.now(), fertig = false, frageStart = 0, zuletzt = 0;
  const seite = (wer, tracht) => { const zahlen = h("b", null, "0/" + aufgaben.length), balken = h("i"), e = h("div", {class:"duellseite"}, figurBild(tracht, "kopf", "klein"), h("div", null, h("span", {class:"duellname"}, wer), h("div", {class:"balken"}, balken), zahlen)); e.zahlen = zahlen; e.balken = balken; return e; };
  const meine = seite(G.name || "Du", G.tracht), seine = seite(String(gegner.name || "?").slice(0, 16), trachtAusText(gegner.figur)), box = h("div", {class:"fragebox karte"});
  zeige(h("div", {class:"kampfkopf"}, h("button", {class:"knopf klein", type:"button", onclick:() => { if (fertig) return; fertig = true; D.nr = aufgaben.length; duellMelden({fertig:true, aufgegeben:true}).then(() => schluss("niederlage")); }}, "Aufgeben"), h("span", {class:"kampftitel"}, "Duell: " + (d.wo || ""))),
    h("div", {class:"duellstand", role:"status"}, meine, h("span", {class:"duellgegen"}, "gegen"), seine), box);
  const maleStand = () => {
    const er = (daten.stand || {})[gegner.uid] || {nr:0, richtig:0};
    meine.zahlen.textContent = D.nr + "/" + aufgaben.length + "  ✓ " + D.richtig; meine.balken.style.width = (100 * D.nr / aufgaben.length) + "%";
    seine.zahlen.textContent = (er.aufgegeben ? "aufgegeben" : (er.nr || 0) + "/" + aufgaben.length + "  ✓ " + (er.richtig || 0)); seine.balken.style.width = (100 * (er.nr || 0) / aufgaben.length) + "%";
  };
  const schluss = urteil => { if (!duellAktiv("duellspiel", marke)) return; const einsatz = duellAbrechnen(urteil); sende(duellPfad(marke.id + "/status"), "PUT", "fertig").catch(() => {}); duellErgebnis(urteil, daten, gegner, einsatz, aufgaben.length); };
  const frage = () => {
    if (D.nr >= aufgaben.length){ fertig = true; duellMelden({fertig:true}); daten.stand = Object.assign({}, daten.stand, {[ich]:duellStand({fertig:true})});
      box.replaceChildren(h("h2", {class:"frage"}, "Geschafft: " + D.richtig + " von " + aufgaben.length + " richtig."), h("p", {class:"anleitung", role:"status"}, "Warte, bis " + (gegner.name || "dein Gegner") + " fertig ist …")); maleStand(); pruefe(); return; }
    const a = aufgaben[D.nr]; frageStart = Date.now();
    const kopf = h("h2", {class:"frage", tabindex:"-1"}, a.frage || "Ergänze den Satz.");
    box.replaceChildren(h("p", {class:"marke2"}, "Frage " + (D.nr + 1) + " von " + aufgaben.length), kopf, AUFGABEN[a.typ](a, ok => {
      tastenhaken = null; D.zeit += (Date.now() - frageStart) / 1000; D.nr++; if (ok) D.richtig++; ton(ok ? "richtig" : "falsch"); zuletzt = Date.now(); duellMelden(); maleStand();
      const weiter = h("button", {class:"knopf haupt", type:"button", onclick:frage}, D.nr >= aufgaben.length ? "Fertig" : "Weiter");
      box.append(rueckmeldung(a, ok, "", [weiter])); try { weiter.focus({preventScroll:true}); } catch (e) {} weiter.scrollIntoView({block:"nearest"});
    }));
    window.scrollTo(0, 0);
  };
  const pruefe = () => { const u = duellUrteil(daten, ich, Date.now() - gegnerNeu > DUELL.stumm); if (u) schluss(u); };
  const takt = async () => {
    if (!duellAktiv("duellspiel", marke)) return;
    try {
      const neu = await anfrage(duellPfad(marke.id)); if (!duellAktiv("duellspiel", marke)) return;
      if (neu && neu.stand){ const er = neu.stand[gegner.uid] || {}; if (er.puls !== gegnerPuls){ gegnerPuls = er.puls; gegnerNeu = Date.now(); }
        neu.stand[ich] = Object.assign({}, neu.stand[ich], (daten.stand || {})[ich], fertig ? {fertig:true} : null); daten = Object.assign({id:marke.id}, neu); maleStand(); }
      if (Date.now() - zuletzt > DUELL.herzschlag){ zuletzt = Date.now(); duellMelden(fertig ? {fertig:true} : null); }
      pruefe();
    } catch (e) {}
    setTimeout(takt, DUELL.takt);
  };
  /* Kurzer Countdown, damit beide etwa gleichzeitig beginnen. */
  let n = 3; const zaehle = () => { if (!duellAktiv("duellspiel", marke)) return; if (n === 0) return frage(); box.replaceChildren(h("p", {class:"duellzahl", role:"status"}, String(n--))); setTimeout(zaehle, 800); };
  maleStand(); zaehle(); takt();
}

function duellErgebnis(urteil, d, gegner, einsatz, anzahl){
  beginne("duellergebnis"); D = null;
  const ich = (d.stand || {})[G.konto.uid] || {}, er = (d.stand || {})[gegner.uid] || {};
  const titel = urteil === "sieg" ? "Gewonnen!" : urteil === "remis" ? "Unentschieden" : "Verloren";
  const zeile = (wer, tracht, s) => h("li", {class:"rangzeile duellzeile"}, figurBild(tracht, "kopf", "klein"), h("span", {class:"rangwer"}, h("b", null, wer), h("span", {class:"leise klein"}, s.aufgegeben ? "aufgegeben" : !s.fertig ? "nicht fertig geworden" : (s.richtig || 0) + " von " + anzahl + " richtig in " + komma(Math.round((s.zeit || 0) * 10) / 10) + " s")));
  if (urteil === "sieg"){ ton("aufstieg"); if (typeof konfetti === "function") konfetti(); } else ton(urteil === "remis" ? "klick" : "falsch");
  rahmen("heim", h("section", {class:"karte duellende " + urteil}, figurBild(Object.assign({}, G.tracht, urteil === "sieg" ? {augen:"augen-lachend", mund:"mund-grinsen"} : urteil === "niederlage" ? {augen:"augen-muede", mund:"mund-schmollen"} : null), "ganz", "gross " + (urteil === "sieg" ? "froh" : urteil === "niederlage" ? "traurig" : "ruhig")),
    h("h1", {class:"duelltitel"}, titel),
    einsatz ? h("p", {class:"duellchips"}, urteil === "sieg" ? "+" + zahl(einsatz) + " Chips" : urteil === "remis" ? "Einsatz zurück" : "−" + zahl(einsatz) + " Chips") : null,
    h("ul", {class:"rangliste"}, zeile(G.name || "Du", G.tracht, ich), zeile(String(gegner.name || "?").slice(0, 16), trachtAusText(gegner.figur), er)),
    h("div", {class:"aktionen"}, h("button", {class:"knopf haupt", type:"button", onclick:duellLobby}, "Noch ein Duell"), h("button", {class:"knopf", type:"button", onclick:heim}, "Zurück"))));
}
