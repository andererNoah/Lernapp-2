"use strict";
/* =====================================================================
   SPIEL: Regeln, Spielstand und Ansichten.

   Das Spiel in vier Sätzen:
     1. KARTE: Jedes Kapitel hat drei Stufen. Eine Runde hat sechs Fragen.
        Wer genug davon auf Anhieb richtig hat, besteht die Stufe: Stern,
        Chips, Truhe. Was falsch war, kommt am Ende als zweite Chance.
     2. CHARAKTER: Mit Chips kaufst du Kleidung und Zubehör für deine Figur
        (figur.js). Die Figur freut sich über richtige Antworten und steht
        neben deinem Namen in der Rangliste.
     3. WIEDERHOLEN: eine kurze Runde quer durch deine Kapitel, zuerst mit
        dem, was laut Lernplan fällig ist.
     4. RANGLISTE: Chips, Quote richtiger Antworten und Erfahrung im Vergleich.

   Zahlen: REGELN. Aufgabentypen: aufgaben.js. Figur und Katalog: figur.js.
   Lernplan: lernplan.js. Serie, Aufträge, Truhen: anreize.js. Lernstoff: inhalte/*.js.
   ===================================================================== */

const REGELN = {
  fragenProRunde: 6, fragenWiederholen: 5, fragenBoss: 10,
  bestehenAb: [3, 4, 5], bestehenBoss: 8,  // so viele Antworten müssen auf Anhieb stimmen (Stufe 1, 2, 3 und Boss)
  beute: [200, 500, 1000], beuteBoss: 1500, wiederholenLohn: 300,   // Chips, wenn alles auf Anhieb stimmt; sonst anteilig
  serieBonus: 20,                          // Chips extra je richtiger Antwort in Folge, ab der zweiten
  erfahrung: {richtig:10, freiAbgerufen:5, zweiteChance:5, sieg:30, neuerStern:50, wiederholen:25},
  tagesziel: 20, tageszielLohn: 50, auftragLohn: 100,
  startChips: 300
};
/* Nur für die Übernahme alter Spielstände: Was das frühere Dorf gekostet hat, wird in Chips erstattet. */
const ALTE_BAUKOSTEN = {zentrale:[0, 400, 900, 1800, 3200], compiler:[0, 250, 600, 1300, 2500], generator:[100, 250, 600, 1300, 2600], firewall:[150, 350, 800, 1700, 3400], labor:[200, 700, 1800]};

/* Der Lernstoff (MODULE, THEMEN, KAPITEL, ALLE_AUFGABEN) wird in lernstoff.js geprüft und aufbereitet. */

/* ---------- Spielstand (bleibt in diesem Browser) ---------- */
const SPEICHER = "chipdorf-v4";
function neuerStand(){
  return {v:5, chips:REGELN.startChips, tracht:Object.assign({}, START_TRACHT), schrank:{}, sterne:{}, lern:{}, wahl:null, xp:0, tag:null, abzeichen:{}, boss:{}, termine:{}, ton:true, zuletzt:"", name:"", konto:null, verdient:0, wetten:{}, duell:null, duelle:{siege:0, niederlagen:0, remis:0},
    serie:{tage:0, letzter:null, schutz:0, rekord:0}, zaehler:{richtig:0, falsch:0, siege:0, perfekt:0, abwehr:0, boss:0}};
}
/* Macht aus gespeicherten Daten einen vollständigen Spielstand (auch aus Vorversionen). Gibt null zurück, wenn die Daten nicht passen. */
function standAus(s){
  if (!s || typeof s !== "object" || !(typeof s.chips === "number" || Array.isArray(s.bau))) return null;
  const leer = neuerStand(), g = Object.assign(neuerStand(), s, {v:5});
  g.zaehler = Object.assign(leer.zaehler, s.zaehler); g.serie = Object.assign(leer.serie, s.serie); g.termine = Object.assign({}, s.termine);
  g.tracht = trachtAus(s.tracht); g.schrank = Object.assign({}, s.schrank); g.wetten = Object.assign({}, s.wetten);
  if (typeof s.klausur === "string" && s.klausur && MODULE[0] && !g.termine[MODULE[0].id]) g.termine[MODULE[0].id] = s.klausur;      // früher gab es nur einen Termin
  if (typeof s.chips !== "number"){                                             // Stand aus der Zeit mit Dorf: Strom, Daten und alles Verbaute werden zu Chips
    let erstattung = -250;                                                      // der erste Generator und die erste Firewall waren geschenkt
    for (const b of s.bau) erstattung += (ALTE_BAUKOSTEN[b.typ] || []).slice(0, b.stufe).reduce((n, x) => n + x, 0);
    for (const stufe of Object.values(s.forschung || {})) erstattung += 5 * [10, 25, 50].slice(0, stufe).reduce((n, x) => n + x, 0);
    g.chips = Math.round((s.strom || 0) + 5 * (s.daten || 0) + Math.max(0, erstattung));
  }
  if (typeof s.verdient !== "number") g.verdient = g.chips + Object.keys(g.schrank).reduce((n, id) => n + (TEIL[id] ? TEIL[id].preis : 0), 0);      // alles, was je verdient wurde
  for (const alt of ["klausur", "bau", "strom", "daten", "forschung", "liga"]) delete g[alt];
  return g;
}
let G = neuerStand();                                  // der gespeicherte Stand wird beim Start geladen, sobald der Lernstoff bereit ist
function sichern(){ try { localStorage.setItem(SPEICHER, JSON.stringify(G)); } catch (e) {} }

/* ---------- Regeln als Funktionen ---------- */
const aktuellesThema = () => THEMEN.find(s => s.id === G.zuletzt) || THEMEN[0];          // das Thema, mit dem zuletzt gespielt wurde
const gewaehlt = k => !G.wahl || G.wahl[k.id] !== false;                                     // Kapitel fürs Wiederholen; neue Kapitel sind von selbst dabei
const sterneGesamt = () => KAPITEL.reduce((n, k) => n + (G.sterne[k.id] || 0), 0);
/* Kleiderschrank */
const besitzt = id => !!TEIL[id] && (TEIL[id].preis === 0 || !!G.schrank[id]);
const gekaufteTeile = () => Object.keys(G.schrank).filter(id => TEIL[id]);
function anziehen(id){ if (!besitzt(id)) return false; G.tracht[TEIL[id].platz] = id; sichern(); return true; }
function kaufen(id){
  const teil = TEIL[id]; if (!teil || besitzt(id) || G.chips < teil.preis) return false;
  G.chips -= teil.preis; G.schrank[id] = heuteNr(); anziehen(id); abzeichenPruefen(); sichern(); return true;
}
/* Was als Nächstes dran ist: Fälliges wiederholen oder das Kapitel mit den wenigsten Sternen angreifen. */
function empfehlung(){
  const faellig = ALLE_AUFGABEN.filter(istFaellig).length;
  if (faellig >= 5) return {titel:faellig + " Aufgaben sind fällig", text:"Wiederhole sie, bevor du sie vergisst.", knopf:"Wiederholen", los:() => starteWiederholen(true)};
  const thema = aktuellesThema(), unfertig = liste => liste.filter(k => (G.sterne[k.id] || 0) < 3);            // erst im laufenden Thema suchen, dann im Modul, dann überall
  const pool = [thema.kapitel, thema.modul.themen.flatMap(s => s.kapitel), KAPITEL].map(unfertig).find(l => l.length) || thema.kapitel;
  const offen = pool.slice().sort((a, b) => (G.sterne[a.id] || 0) - (G.sterne[b.id] || 0))[0];
  const stufe = Math.min(3, (G.sterne[offen.id] || 0) + 1);
  return {titel:offen.titel, text:(THEMEN.length > 1 ? offen.thema.titel + ", " : "") + "Stufe " + stufe, knopf:"Los!", los:() => starteRunde(offen, stufe)};
}

/* ---------- Rahmen: Ansicht wechseln, Leinwand, Zeitschleife ---------- */
const app = document.getElementById("app");
let ansicht = "", live = [], liveListe = [], meldeFeld = null, meldeBis = 0;
function beginne(name){ ansicht = name; tastenhaken = null; live = []; liveListe = []; meldeFeld = null; document.body.dataset.ansicht = name; }
function zeige(...knoten){ app.replaceChildren(...knoten.flat().filter(Boolean)); window.scrollTo(0, 0); }
function puls(){ live.forEach(f => f()); liveListe.forEach(f => f()); }
function melde(text){ if (!meldeFeld) return; meldeFeld.textContent = text; meldeBis = Date.now() + 2600; }
setInterval(() => { if (meldeFeld && meldeBis && Date.now() > meldeBis){ meldeFeld.textContent = ""; meldeBis = 0; } puls(); }, 500);
window.addEventListener("resize", () => { if (ansicht === "angriff") zeichnePfad(); });
/* Oben: Rang, Chips, Sterne, Serie. Unten: die fünf Bereiche. */
function rahmen(aktiv, ...inhalt){
  const stufe = h("b"), name = h("span", {class:"rangname"}), xp = h("i"), chips = h("b"), sterne = h("b"), serie = h("b"), faellig = h("span", {class:"zahlmarke", hidden:true});
  live.push(() => { const r = rang(); stufe.textContent = r.stufe; name.textContent = r.name; xp.style.width = Math.round(100 * r.rest / r.noetig) + "%";
    chips.textContent = zahl(G.chips); sterne.textContent = sterneGesamt(); serie.textContent = G.serie.tage;
    const n = ALLE_AUFGABEN.filter(istFaellig).length; faellig.hidden = !n; faellig.textContent = n; });
  const bereiche = [["heim", "Charakter", "figur", heim], ["angriff", "Karte", "karte", angriffsKarte], ["abwehr", "Wiederholen", "schild", abwehrWahl], ["rangliste", "Rangliste", "pokal", rangliste], ["fortschritt", "Fortschritt", "balken", fortschritt]];
  zeige(h("header", {class:"kopfleiste"},
      h("button", {class:"rang", type:"button", onclick:fortschritt, "aria-label":"Fortschritt ansehen"}, h("span", {class:"rangzahl"}, stufe), h("span", {class:"rangtext"}, name, h("span", {class:"xpbalken"}, xp))),
      h("span", {class:"pille", title:"Chips"}, symbol("daten", "gelb"), chips, h("span", {class:"nurleser"}, " Chips")),
      h("span", {class:"pille", title:"Sterne"}, symbol("stern", "gelb"), sterne, h("span", {class:"nurleser"}, " Sterne")),
      h("span", {class:"pille", title:"Tage in Folge"}, symbol("flamme", "orange"), serie, h("span", {class:"nurleser"}, " Tage in Folge"))),
    h("main", {class:"seite"}, inhalt),
    h("nav", {class:"fussleiste", "aria-label":"Bereiche"}, bereiche.map(([id, text, bildname, oeffne]) =>
      h("button", {type:"button", "aria-current":id === aktiv ? "page" : null, onclick:oeffne}, symbol(bildname), h("span", null, text), id === "abwehr" ? faellig : null))));
  puls(); feiere();
}
/* Zeigt nacheinander an, was sich in FEIERN angesammelt hat (Aufstieg, Serie, Abzeichen …). */
function feiere(){
  let box = document.querySelector(".feiern"); if (!box){ box = h("div", {class:"feiern", role:"status"}); document.body.append(box); }
  let warte = 0;
  while (FEIERN.length){
    const e = FEIERN.shift(), karte = h("div", {class:"feier " + e.art}, h("b", null, e.text), e.mehr ? h("span", null, e.mehr) : null);
    setTimeout(() => { box.append(karte); if (e.art === "aufstieg"){ ton("aufstieg"); konfetti(); } else if (e.art !== "serieWeg") ton("muenze"); setTimeout(() => karte.remove(), 3600); }, warte);
    warte += 900;
  }
  sichern();
}
/* Fenster über der Seite, z. B. für Truhen, Forschung, Kapitel. Gibt die Funktion zum Schließen zurück. */
function fenster(...inhalt){
  const zu = () => { hinten.remove(); puls(); feiere(); };
  const hinten = h("div", {class:"fenster", role:"dialog", "aria-modal":"true", onclick:e => { if (e.target === hinten && hinten.dataset.frei) zu(); }}, h("div", {class:"fensterkarte"}, inhalt));
  document.body.append(hinten); return zu;
}
function truhenFenster(art, mal, anlass, danach){
  const bildchen = truheBild(art), inhalt = h("div", {class:"truheninhalt"});
  const knopf = h("button", {class:"knopf haupt gross", type:"button", onclick:() => {
    const t = truheOeffnen(art, mal); sichern(); ton("truhe"); bildchen.classList.add("offen");
    const chips = h("b"); inhalt.replaceChildren(...[h("p", {class:"gewinn"}, symbol("daten", "gelb"), chips, " Chips"),
      t.xp ? h("p", {class:"gewinn klein"}, "+" + t.xp + " Erfahrung") : null, t.schutz ? h("p", {class:"gewinn klein"}, symbol("flamme", "orange"), "+1 Serienschutz") : null].filter(Boolean));
    zaehleHoch(chips, 0, t.chips, "+");
    knopf.replaceWith(h("button", {class:"knopf haupt gross", type:"button", onclick:() => { zu(); if (danach) danach(); }}, "Einsammeln"));
  }}, "Öffnen");
  const zu = fenster(h("p", {class:"leise"}, anlass), h("h2", {class:"fenstertitel"}, TRUHEN[art].name), bildchen, inhalt, knopf);
}

/* =====================================================================
   BEREICH 1: CHARAKTER (deine Figur, der nächste Schritt, das Tagesziel) und der LADEN
   ===================================================================== */
function heim(){
  beginne("heim"); tagPruefen();
  const e = empfehlung(), r = rang(), n = gekaufteTeile().length;
  rahmen("heim",
    h("section", {class:"karte figurkarte"}, figurBild(G.tracht, "ganz", "gross"),
      h("div", {class:"figurtext"}, h("p", {class:"leise"}, "Rang " + r.stufe + ", " + r.name), h("h2", null, G.name || "Dein Charakter"),
        h("p", {class:"leise klein"}, n ? n + (n === 1 ? " gekauftes Teil" : " gekaufte Teile") + " im Kleiderschrank" : "Verdiene Chips auf der Karte und kleide deine Figur ein."),
        h("div", {class:"aktionen"}, h("button", {class:"knopf gelb", type:"button", onclick:() => laden()}, "Kleiderschrank"), h("button", {class:"knopf", type:"button", onclick:duellLobby}, "Duell"), h("button", {class:"knopf", type:"button", onclick:spielecke}, "Spiele-Ecke")))),
    h("section", {class:"karte naechstes"}, h("div", null, h("p", {class:"leise"}, "Als Nächstes"), h("h2", null, e.titel), h("p", null, e.text)),
      h("button", {class:"knopf haupt riesig", type:"button", onclick:e.los}, e.knopf)),
    heuteKarte(),
    NEUES.length ? h("p", {class:"einstieg klein"}, h("button", {class:"textknopf", type:"button", onclick:() => neuesFenster(true)}, "Was ist neu?")) : null);
}
/* Kleines Fenster mit den Neuerungen. Beim Start nur die noch nicht gesehenen (alles = false), über den Link alle. */
function neuesFenster(alles){
  const gesehen = G.neuesGesehen || 0, neueste = NEUES.reduce((n, e) => Math.max(n, e.nr || 0), 0);
  const liste = NEUES.filter(e => alles || (e.nr || 0) > gesehen).sort((a, b) => (b.nr || 0) - (a.nr || 0)).slice(0, alles ? 20 : 3);
  if (!liste.length) return;
  const knopf = h("button", {class:"knopf haupt", type:"button", onclick:() => { G.neuesGesehen = Math.max(gesehen, neueste); sichern(); zu(); }}, "Alles klar");
  const zu = fenster(h("h2", {class:"fenstertitel"}, "Was ist neu?"), h("div", {class:"neues"}, liste.map(e => h("section", null, h("p", {class:"leise klein"}, e.datum || ""), h("h3", null, e.titel || ""), h("ul", null, (e.punkte || []).map(p => h("li", null, p)))))), knopf);
  try { knopf.focus({preventScroll:true}); } catch (e) {}
}
/* Tagesziel, Truhen und die drei Tagesaufträge. */
function heuteKarte(){
  const t = G.tag, zielBalken = h("i"), zielText = h("p", {class:"leise klein"});
  live.push(() => { zielBalken.style.width = Math.min(100, Math.round(100 * G.tag.richtig / REGELN.tagesziel)) + "%"; zielText.textContent = "Tagesziel: " + Math.min(G.tag.richtig, REGELN.tagesziel) + " von " + REGELN.tagesziel + " richtigen Antworten"; });
  const truhe = t.truhe ? null : h("button", {class:"truhenknopf", type:"button", onclick:() => { G.tag.truhe = true; sichern(); truhenFenster(truheWuerfeln(), 1 + Math.floor(rang().stufe / 5), "Deine Tagestruhe", heim); }}, truheBild("holz"), h("span", null, "Tagestruhe"));
  const auftraege = tagesAuftraege().map(a => h("li", {class:"auftrag" + (a.geholt ? " erledigt" : "")},
    h("div", null, h("p", null, a.text), h("div", {class:"balken"}, h("i", {style:"width:" + Math.round(100 * a.ist / a.ziel) + "%"})), h("p", {class:"leise klein"}, a.geholt ? "Abgeholt" : a.ist + " von " + a.ziel)),
    a.fertig && !a.geholt ? h("button", {class:"knopf gelb", type:"button", onclick:() => { if (auftragAbholen(a.id)){ ton("muenze"); sichern(); heim(); } }}, "+" + REGELN.auftragLohn) : null));
  const bonus = alleAuftraegeGeholt() && !t.bonus ? h("button", {class:"truhenknopf", type:"button", onclick:() => { G.tag.bonus = true; sichern(); truhenFenster(Math.random() < .25 ? "gold" : "silber", 2, "Alle Tagesaufträge erledigt", heim); }}, truheBild("silber"), h("span", null, "Bonustruhe")) : null;
  return h("section", {class:"karte heute"},
    h("div", {class:"kartenkopf"}, h("h2", null, "Heute"), h("div", {class:"truhenreihe"}, truhe, bonus)),
    h("div", {class:"balken dick"}, zielBalken), zielText,
    h("ul", {class:"auftraege"}, auftraege));
}
/* Der Laden: anprobieren, kaufen, anziehen. Was dir gehört, ziehst du mit einem Tipp an. */
let ladenPlatz = "oben";
function laden(platz){
  beginne("laden"); tagPruefen(); if (platz) ladenPlatz = platz;
  let probe = null;                                                              // Teil, das gerade nur anprobiert wird
  const spiegel = h("div", {class:"anprobe"}), leiste = h("div", {class:"kaufleiste", role:"status"}), raster = h("ul", {class:"teile"});
  const ausschnitt = {oben:"oben", unten:"unten", schuhe:"schuhe", hinter:"ganz", extra:"ganz"}[ladenPlatz] || "kopf";
  const male = () => {
    const tracht = probe ? Object.assign({}, G.tracht, {[probe.platz]:probe.id}) : G.tracht;
    spiegel.replaceChildren(figurBild(tracht, "ganz", "gross"));
    if (probe){ const fehlt = probe.preis - G.chips;
      leiste.replaceChildren(h("div", null, h("b", null, probe.name), h("span", {class:"leise klein"}, SELTENHEIT[probe.selten] + (fehlt > 0 ? ". Es fehlen " + zahl(fehlt) + " Chips." : ""))),
        h("button", {class:"knopf gelb", type:"button", disabled:fehlt > 0, onclick:() => { const teil = probe; if (!kaufen(teil.id)) return; probe = null; ton(teil.selten >= 2 ? "aufstieg" : "muenze"); if (teil.selten >= 2) konfetti(); ranglisteMeldenLeise(); male(); puls(); feiere(); }},
          symbol("daten"), zahl(probe.preis))); }
    else { const an = TEIL[G.tracht[ladenPlatz]]; leiste.replaceChildren(h("div", null, h("b", null, an.name), h("span", {class:"leise klein"}, "Trägst du gerade. Tippe ein Teil an, um es anzuprobieren."))); }
    raster.replaceChildren(...KATALOG.filter(t => t.platz === ladenPlatz).sort((a, b) => a.preis - b.preis).map(t => { const meins = besitzt(t.id), an = G.tracht[t.platz] === t.id, wahl = probe === t;
      return h("li", null, h("button", {class:"teil selten" + t.selten + (an ? " an" : "") + (wahl ? " probe" : ""), type:"button", "aria-pressed":String(an || wahl),
        "aria-label":t.name + ", " + (an ? "trägst du" : meins ? "gehört dir" : zahl(t.preis) + " Chips, " + SELTENHEIT[t.selten]),
        onclick:() => { if (meins){ probe = null; anziehen(t.id); ton("klick"); ranglisteMeldenLeise(); } else probe = wahl ? null : t; male(); }},
        figurBild(Object.assign({}, G.tracht, {[t.platz]:t.id}), ausschnitt), h("span", {class:"teilname"}, t.name),
        h("span", {class:"teilpreis"}, an ? "an" : meins ? "deins" : [symbol("daten", "gelb"), zahl(t.preis)]))); }));
  };
  const reiter = PLAETZE.map(([id, name]) => h("button", {type:"button", "aria-pressed":String(id === ladenPlatz), onclick:() => laden(id)}, name));
  rahmen("heim", h("div", {class:"ladenkopf"}, h("button", {class:"knopf klein", type:"button", onclick:heim}, "Zurück"), h("h1", {class:"seitentitel"}, "Kleiderschrank")),
    h("section", {class:"karte anprobekarte"}, spiegel, leiste), h("div", {class:"platzreiter", role:"group", "aria-label":"Was möchtest du ändern?"}, reiter), raster);
  male();
  const aktiv = document.querySelector('.platzreiter [aria-pressed="true"]'); if (aktiv && aktiv.scrollIntoView) aktiv.scrollIntoView({block:"nearest", inline:"center"});
}

/* =====================================================================
   BEREICH 2: WELTKARTE (ein Punkt pro Kapitel, am Ende der Klausur-Boss)
   ===================================================================== */
function reifeBalken(aufgaben){
  const l = lernstand(aufgaben);
  return h("div", {class:"balken reife", role:"img", "aria-label":l.fest + " von " + l.gesamt + " Aufgaben klausurfest, " + l.inArbeit + " in Arbeit"},
    h("i", {class:"fest", style:"width:" + (100 * l.fest / l.gesamt) + "%"}), h("i", {class:"arbeit", style:"width:" + (100 * l.inArbeit / l.gesamt) + "%"}));
}
const sternchen = n => h("span", {class:"inselsterne", role:"img", "aria-label":n + " von 3 Sternen"}, [1, 2, 3].map(i => symbol("stern", i <= n ? "an" : "aus")));
const VERSATZ = [20, 62, 36, 72, 26, 58, 40, 68];
function angriffsKarte(){
  beginne("angriff"); tagPruefen();
  const thema = aktuellesThema();
  /* Modul und Thema sind immer zu sehen. Was in aufbau.js noch ohne Inhalt steht, erscheint ausgegraut als Platzhalter. */
  const knopf = (titel, aktiv, ziel) => h("button", {class:"knopf klein" + (aktiv ? " gelb" : ""), type:"button", "aria-pressed":String(aktiv), onclick:() => { G.zuletzt = ziel.id; sichern(); angriffsKarte(); }}, titel);
  const platzhalter = (titel, name) => h("button", {class:"knopf klein", type:"button", disabled:true, "aria-label":name + ", " + titel}, titel);
  const zeile = (name, knoepfe) => h("div", {class:"auswahl", role:"group", "aria-label":name}, h("span", {class:"auswahlname"}, name), knoepfe);
  const wahl = [zeile("Modul", MODULE_ALLE.map((m, i) => m.themen.length ? knopf(m.titel, m === thema.modul, m.themen[0]) : platzhalter(m.titel, "Modul " + (i + 1)))),
    zeile("Thema", [thema.modul.themen.map(t => knopf(t.titel, t === thema, t)), thema.modul.folgt.map(t => platzhalter(t.titel, "Weiteres Thema"))])];
  const inseln = thema.kapitel.map((k, i) => { const st = G.sterne[k.id] || 0, f = k.aufgaben.filter(istFaellig).length;
    return h("button", {class:"insel" + (st >= 3 ? " fertig" : st ? " begonnen" : ""), type:"button", style:"--versatz:" + VERSATZ[i % 8] + "%", onclick:() => kapitelFenster(k)},
      h("span", {class:"platte"}, i + 1, f ? h("span", {class:"zahlmarke"}, f) : null), sternchen(st), h("span", {class:"inselname"}, k.titel)); });
  const bossOffen = thema.kapitel.every(k => (G.sterne[k.id] || 0) >= 1), besiegt = G.boss[thema.id] === wocheNr();
  inseln.push(h("button", {class:"insel boss" + (besiegt ? " fertig" : ""), type:"button", style:"--versatz:" + VERSATZ[thema.kapitel.length % 8] + "%", onclick:() => bossFenster(thema, bossOffen)},
    h("span", {class:"platte"}, bossOffen ? symbol("pokal") : symbol("schloss")), h("span", {class:"inselname"}, "Klausur-Boss")));
  rahmen("angriff", h("h1", {class:"seitentitel"}, "Weltkarte"), wahl, h("p", {class:"einstieg"}, thema.titel + ": Tippe ein Kapitel an."),
    h("div", {class:"welt"}, h("div", {class:"pfad", "aria-hidden":"true"}), inseln));
  zeichnePfad();
}
/* Verbindet die Inseln der Weltkarte mit einer gestrichelten Linie. */
function zeichnePfad(){
  const welt = document.querySelector(".welt"), pfad = welt && welt.querySelector(".pfad"); if (!pfad) return;
  const r = welt.getBoundingClientRect(), punkte = [...welt.querySelectorAll(".platte")].map(p => { const q = p.getBoundingClientRect(); return Math.round(q.left + q.width / 2 - r.left) + "," + Math.round(q.top + q.height / 2 - r.top); });
  pfad.innerHTML = '<svg width="' + Math.round(r.width) + '" height="' + Math.round(r.height) + '"><polyline points="' + punkte.join(" ") + '" fill="none" stroke-width="7" stroke-dasharray="2 16" stroke-linecap="round"/></svg>';
}
function kapitelFenster(k){
  const st = G.sterne[k.id] || 0, l = lernstand(k.aufgaben);
  const stufen = [1, 2, 3].map(i => h("button", {class:"stufenknopf" + (i <= st ? " gewonnen" : ""), type:"button", disabled:i > st + 1,
    "aria-label":"Stufe " + i + (i <= st ? ", bestanden. Noch einmal spielen" : i > st + 1 ? ", gesperrt" : " spielen"), onclick:() => { zu(); starteRunde(k, i); }},
    i > st + 1 ? symbol("schloss") : symbol("stern"), h("span", null, "Stufe " + i), h("span", {class:"abwehrtext"}, "mindestens " + REGELN.bestehenAb[i - 1] + " von " + REGELN.fragenProRunde + " auf Anhieb richtig")));
  const zu = fenster(h("h2", {class:"fenstertitel"}, k.titel), h("p", {class:"leise"}, k.stichworte), reifeBalken(k.aufgaben),
    h("p", {class:"leise klein"}, l.fest + " von " + l.gesamt + " Aufgaben klausurfest" + (l.faellig ? ", " + l.faellig + " fällig" : "")),
    h("div", {class:"stufen"}, stufen), h("button", {class:"knopf klein", type:"button", onclick:() => zu()}, "Zurück"));
}
function bossFenster(thema, offen){
  const besiegt = G.boss[thema.id] === wocheNr();
  const zu = fenster(h("h2", {class:"fenstertitel"}, "Klausur-Boss"), h("p", null, REGELN.fragenBoss + " Fragen quer durch alle Kapitel, überwiegend frei zu beantworten. So ähnlich fühlt sich die Klausur an."),
    h("p", {class:"leise klein"}, "Bestanden mit mindestens " + REGELN.bestehenBoss + " von " + REGELN.fragenBoss + " auf Anhieb richtigen Antworten."),
    h("p", {class:"leise klein"}, !offen ? "Hole zuerst in jedem Kapitel mindestens einen Stern." : besiegt ? "Diese Woche schon besiegt. Die Goldtruhe gibt es ab Montag wieder." : "Der erste Sieg der Woche bringt eine Goldtruhe."),
    h("div", {class:"aktionen mitte"}, h("button", {class:"knopf haupt gross", type:"button", disabled:!offen, onclick:() => { zu(); starteBoss(thema); }}, "Boss starten"), h("button", {class:"knopf", type:"button", onclick:() => zu()}, "Zurück")));
}

/* =====================================================================
   BEREICH 3: WIEDERHOLEN (kurze Runde, Fälliges zuerst)
   ===================================================================== */
function abwehrWahl(){
  beginne("abwehr"); tagPruefen(); G.wahl = G.wahl || {};
  const start = h("button", {class:"knopf haupt riesig", type:"button", onclick:() => starteWiederholen(false)}, "Runde starten");
  const stand = h("p", {class:"leise"});
  live.push(() => { const gew = KAPITEL.filter(gewaehlt), n = gew.flatMap(k => k.aufgaben).filter(istFaellig).length; start.disabled = !gew.length;
    stand.textContent = !gew.length ? "Wähle mindestens ein Kapitel." : n ? n + " fällige Aufgaben in deiner Auswahl. Sie kommen zuerst dran." : "In deiner Auswahl ist gerade nichts fällig. Du kannst trotzdem üben."; });
  /* Pro Thema ein aufklappbarer Block, damit die Seite auch mit vielen Themen kurz bleibt. */
  const block = thema => {
    const haken = thema.kapitel.map(k => { const f = k.aufgaben.filter(istFaellig).length, box = h("input", {type:"checkbox", checked:gewaehlt(k) ? true : null, onchange:() => { G.wahl[k.id] = box.checked; sichern(); puls(); }});
      return h("label", {class:"haken"}, box, h("span", null, k.titel), f ? h("span", {class:"zahlmarke"}, f) : null); });
    const alle = an => () => { thema.kapitel.forEach(k => G.wahl[k.id] = an); G.zuletzt = thema.id; sichern(); abwehrWahl(); };
    const wieViele = h("span", {class:"leise klein"}); live.push(() => { wieViele.textContent = thema.kapitel.filter(gewaehlt).length + " von " + thema.kapitel.length + " Kapiteln"; });
    return h("details", {class:"karte themawahl", open:THEMEN.length === 1 || thema === aktuellesThema() ? true : null}, h("summary", null, h("span", {class:"themaname"}, thema.titel), wieViele), haken,
      h("p", {class:"leise klein"}, h("button", {class:"textknopf", type:"button", onclick:alle(true)}, "Alle"), " ", h("button", {class:"textknopf", type:"button", onclick:alle(false)}, "Keine")));
  };
  rahmen("abwehr", h("h1", {class:"seitentitel"}, "Wiederholen"),
    h("p", {class:"einstieg"}, REGELN.fragenWiederholen + " Fragen quer durch deine Kapitel. Was laut Lernplan fällig ist, kommt zuerst."),
    h("div", {class:"karte startkarte"}, start, stand), MODULE.map(m => [MODULE.length > 1 ? h("h2", {class:"abschnitt"}, m.titel) : null, m.themen.map(block)]));
}

/* =====================================================================
   BEREICH 4: FORTSCHRITT (Klausurreife, Abzeichen, Einstellungen)
   ===================================================================== */
function fortschritt(){
  beginne("fortschritt"); tagPruefen();
  const r = rang();
  /* Klausurreife und Termin gibt es pro Modul, weil jedes Modul seine eigene Klausur hat. */
  const reifeKarten = MODULE.map(m => {
    const aufgaben = aufgabenVon(m), l = lernstand(aufgaben), termin = G.termine[m.id] || "";
    const datum = h("input", {class:"datumsfeld", type:"date", value:termin || null, "aria-label":"Klausurtermin" + (MODULE.length > 1 ? " " + m.titel : ""), onchange:() => { G.termine[m.id] = datum.value; sichern(); fortschritt(); }});
    let rat = "Trag deinen Klausurtermin ein, dann rechne ich dir aus, wie viele neue Aufgaben du pro Tag brauchst.";
    if (termin){
      const tage = Math.round((new Date(termin + "T12:00").getTime() - Date.now()) / 86400000);
      rat = tage < 0 ? "Der Termin liegt in der Vergangenheit." : tage < 5 ? "Noch " + tage + " Tage. Für drei Abrufe an verschiedenen Tagen wird es knapp: Spiel täglich Angriff und Wiederholen und nimm dir zuerst die offenen Erklär-Aufgaben vor."
        : "Noch " + tage + " Tage. Klausurfest wird eine Aufgabe nach drei richtigen Abrufen an verschiedenen Tagen, das dauert mindestens 5 Tage. "
          + (l.neu ? "Sieh dir deshalb jeden Tag mindestens " + (n => n === 1 ? "eine neue Aufgabe" : n + " neue Aufgaben")(Math.max(1, Math.ceil(l.neu / (tage - 4)))) + " an und erledige alles, was fällig ist." : "Du hast jede Aufgabe schon einmal gesehen. Erledige jetzt jeden Tag, was fällig ist.");
    }
    return h("section", {class:"karte reifekarte"}, h("p", {class:"leise"}, "Klausurreife" + (MODULE.length > 1 ? ": " + m.titel : "")), h("p", {class:"riesenzahl"}, Math.round(100 * l.fest / l.gesamt) + " %"), reifeBalken(aufgaben),
      h("p", null, l.fest + " von " + l.gesamt + " Aufgaben sind klausurfest: an drei verschiedenen Tagen richtig abgerufen. " + l.inArbeit + " sind in Arbeit, " + l.neu + " hast du noch nicht gesehen."),
      h("div", {class:"terminzeile"}, h("label", null, "Klausur am ", datum)), h("p", {class:"leise"}, rat));
  });
  const kapitelZeile = k => { const s = lernstand(k.aufgaben); return h("li", {class:"posten reihe"}, h("div", null, h("h3", null, k.titel), reifeBalken(k.aufgaben),
    h("p", {class:"leise klein"}, s.fest + " klausurfest, " + s.inArbeit + " in Arbeit, " + s.neu + " neu")), h("span", {class:"prozent"}, Math.round(100 * s.fest / s.gesamt) + " %")); };
  /* Bei mehreren Themen ein aufklappbarer Block je Thema. */
  const kapitel = THEMEN.length === 1 ? h("ul", {class:"liste"}, KAPITEL.map(kapitelZeile)) : THEMEN.map(s => { const l = lernstand(s.kapitel.flatMap(k => k.aufgaben));
    return h("details", {class:"themablock", open:s === aktuellesThema() ? true : null}, h("summary", null, h("span", {class:"themaname"}, s.titel), h("span", null, Math.round(100 * l.fest / l.gesamt) + " %")), h("ul", {class:"liste"}, s.kapitel.map(kapitelZeile))); });
  const abz = ABZEICHEN.map(a => h("li", {class:"abzeichen" + (G.abzeichen[a.id] ? " hat" : "")}, symbol(G.abzeichen[a.id] ? "pokal" : "schloss"), h("b", null, a.name), h("span", null, a.text)));
  const tonKnopf = h("button", {class:"knopf", type:"button", onclick:() => { G.ton = !G.ton; sichern(); ton("klick"); fortschritt(); }}, G.ton ? "Ton ausschalten" : "Ton einschalten");
  const loeschen = h("p", {class:"leise klein"});
  const normal = () => loeschen.replaceChildren(h("button", {class:"textknopf", type:"button", onclick:() => loeschen.replaceChildren("Wirklich alles löschen? ",
    h("button", {class:"textknopf", type:"button", onclick:() => { const {name, konto} = G; G = neuerStand(); G.name = name; G.konto = konto; tagPruefen(); sichern(); ranglisteMeldenLeise(); heim(); }}, "Ja, Spielstand löschen"), " ", h("button", {class:"textknopf", type:"button", onclick:normal}, "Abbrechen"))}, "Spielstand löschen"));
  normal();
  rahmen("fortschritt", h("h1", {class:"seitentitel"}, "Fortschritt"),
    reifeKarten,
    h("section", {class:"karte"}, h("p", {class:"leise"}, "Rang " + r.stufe), h("h2", null, r.name), h("div", {class:"balken dick"}, h("i", {style:"width:" + Math.round(100 * r.rest / r.noetig) + "%"})),
      h("p", {class:"leise"}, r.rest + " von " + r.noetig + " Erfahrung bis zum nächsten Rang. Längste Serie: " + G.serie.rekord + " Tage. Serienschutz: " + G.serie.schutz + ". Richtige Antworten insgesamt: " + zahl(G.zaehler.richtig) + ".")),
    h("h2", {class:"abschnitt"}, "Kapitel"), kapitel,
    h("h2", {class:"abschnitt"}, "Abzeichen"), h("ul", {class:"abzeichenliste"}, abz),
    h("h2", {class:"abschnitt"}, "Einstellungen"), h("div", {class:"aktionen"}, tonKnopf, h("button", {class:"knopf", type:"button", onclick:sichernFenster}, "Spielstand sichern"), h("button", {class:"knopf", type:"button", onclick:ladenFenster}, "Spielstand laden")), loeschen, h("p", {class:"leise klein"}, "Dein Spielstand bleibt in diesem Browser gespeichert. Mit „Spielstand sichern“ nimmst du ihn auf ein anderes Gerät mit."));
}
/* Spielstand als Code oder Datei herausgeben. */
function sichernFenster(){
  const feld = h("textarea", {class:"codefeld", readonly:true, rows:"5", "aria-label":"Dein Spielstand als Code"}), hinweis = h("p", {class:"leise klein", role:"status"});
  spielstandCode().then(code => { feld.value = code; });
  const kopieren = h("button", {class:"knopf haupt", type:"button", onclick:async () => {
    try { await navigator.clipboard.writeText(feld.value); hinweis.textContent = "Code kopiert."; } catch (e) { feld.focus(); feld.select(); hinweis.textContent = "Der Code ist markiert. Kopiere ihn jetzt von Hand."; } }}, "Code kopieren");
  const datei = h("button", {class:"knopf", type:"button", onclick:() => {
    const a = h("a", {href:URL.createObjectURL(new Blob([feld.value], {type:"text/plain"})), download:"chipdorf-spielstand.txt"}); document.body.append(a); a.click(); a.remove(); hinweis.textContent = "Datei gespeichert."; }}, "Als Datei speichern");
  const zu = fenster(h("h2", {class:"fenstertitel"}, "Spielstand sichern"), h("p", {class:"leise"}, "Schick dir den Code selbst, zum Beispiel per Mail oder Messenger. Auf dem anderen Gerät fügst du ihn unter „Spielstand laden“ ein."),
    feld, hinweis, h("div", {class:"aktionen"}, kopieren, datei, h("button", {class:"knopf", type:"button", onclick:() => zu()}, "Schließen")));
}
/* Spielstand aus Code oder Datei einlesen. Ersetzt den jetzigen Stand erst nach einer Rückfrage. */
function ladenFenster(){
  const feld = h("textarea", {class:"codefeld", rows:"5", placeholder:"Code hier einfügen", "aria-label":"Code eines gesicherten Spielstands"}), hinweis = h("p", {class:"leise klein", role:"status"}), knoepfe = h("div", {class:"aktionen"});
  const wahl = h("input", {type:"file", accept:".txt,text/plain", "aria-label":"Datei mit gesichertem Spielstand", onchange:async () => { if (wahl.files[0]) feld.value = await wahl.files[0].text(); }});
  const sterne = s => (n => n + (n === 1 ? " Stern" : " Sterne"))(Object.values(s.sterne || {}).reduce((n, x) => n + x, 0));
  const normal = () => knoepfe.replaceChildren(h("button", {class:"knopf haupt", type:"button", onclick:async () => {
    const s = await spielstandAusCode(feld.value);
    if (!s){ hinweis.textContent = "Das ist kein gültiger Spielstand-Code. Prüf, ob er vollständig kopiert ist."; return; }
    hinweis.textContent = "Der gesicherte Spielstand hat " + sterne(s) + " und " + zahl(s.xp) + " Erfahrung. Er ersetzt deinen jetzigen (" + sterne(G) + ", " + zahl(G.xp) + " Erfahrung).";
    knoepfe.replaceChildren(h("button", {class:"knopf haupt", type:"button", onclick:() => { G = s; kontoToken = null; tagPruefen(); sichern(); zu(); heim(); }}, "Ja, ersetzen"), h("button", {class:"knopf", type:"button", onclick:normal}, "Abbrechen"));
  }}, "Laden"), h("button", {class:"knopf", type:"button", onclick:() => zu()}, "Schließen"));
  normal();
  const zu = fenster(h("h2", {class:"fenstertitel"}, "Spielstand laden"), h("p", {class:"leise"}, "Füge den Code ein oder wähle die gespeicherte Datei."), feld, wahl, hinweis, knoepfe);
}

/* =====================================================================
   BEREICH 5: RANGLISTE (gemeinsam mit dem Kurs; die Verbindung steckt in rangliste.js)
   ===================================================================== */
let ranglisteArt = "chips";
const RANGARTEN = [["chips", "Chips", e => e.chips, "Chips verdient"], ["quote", "Quote", e => e.gewertet ? e.quote : -1, "richtig"], ["xp", "Erfahrung", e => e.xp, "Erfahrung"], ["duell", "Duelle", e => e.siege - e.niederlagen / 100000, "Siege"]];
function rangliste(){
  beginne("rangliste"); tagPruefen();
  const inhalt = h("div", {class:"ranginhalt"});
  rahmen("rangliste", h("h1", {class:"seitentitel"}, "Rangliste"), inhalt);
  if (!ranglisteAn()){ inhalt.append(h("section", {class:"karte"}, h("h2", null, "Noch nicht eingerichtet"),
    h("p", null, "Auf dieser Seite ist keine gemeinsame Rangliste hinterlegt. Deine Chips sammelst du trotzdem: Sobald die Rangliste eingerichtet ist, erscheinen sie dort."))); return; }
  if (!G.name){ inhalt.append(namensKarte("Mitmachen")); return; }
  const liste = h("ol", {class:"rangliste"}), stand = h("p", {class:"einstieg", role:"status"}, "Lade Rangliste …"); let eintraege = null;
  const reiter = RANGARTEN.map(([id, text]) => h("button", {type:"button", "aria-pressed":String(ranglisteArt === id), onclick:() => { ranglisteArt = id; reiter.forEach((r, i) => r.setAttribute("aria-pressed", String(RANGARTEN[i][0] === id))); male(); }}, text));
  const male = () => {
    if (!eintraege) return;
    const [art, , wert, einheit] = RANGARTEN.find(r => r[0] === ranglisteArt);
    const sortiert = eintraege.slice().sort((a, b) => wert(b) - wert(a) || b.xp - a.xp || a.name.localeCompare(b.name)), ich = sortiert.findIndex(e => e.ich);
    const zeile = (e, i) => h("li", {class:"rangzeile" + (e.ich ? " ich" : "") + (i < 3 ? " platz" + (i + 1) : "")}, h("span", {class:"platz"}, i + 1), figurBild(e.tracht, "kopf", "klein"),
      h("span", {class:"rangwer"}, h("b", null, e.name, e.ich ? " (du)" : ""), h("span", {class:"leise klein"}, zahl(e.richtig + e.falsch) + (e.richtig + e.falsch === 1 ? " Frage: " : " Fragen: ") + zahl(e.richtig) + " richtig, " + zahl(e.falsch) + " falsch")),
      h("span", {class:"rangwert"}, h("b", null, art === "quote" ? (e.gewertet ? e.quote + " %" : "–") : art === "duell" ? zahl(e.siege) : zahl(wert(e))), h("span", {class:"leise klein"}, art === "quote" && !e.gewertet ? "ab 20 Antworten" : art === "duell" ? (e.siege === 1 ? "Sieg, " : "Siege, ") + zahl(e.niederlagen) + " verloren" : einheit)));
    const zeilen = sortiert.slice(0, 50).map(zeile); if (ich >= 50) zeilen.push(h("li", {class:"rangluecke", "aria-hidden":"true"}, "…"), zeile(sortiert[ich], ich));
    liste.replaceChildren(...zeilen);
    stand.textContent = sortiert.length + " Mitspieler. " + {chips:"Gezählt werden alle Chips, die du je verdient hast, samt Gewinnen und Verlusten aus der Spiele-Ecke. Einkaufen kostet keinen Platz.", quote:"Anteil der Antworten, die beim ersten Versuch richtig waren. Gewertet wird ab 20 Antworten.", xp:"Gezählt wird die Erfahrung seit Spielbeginn.", duell:"Gezählt werden gewonnene Duelle. Bei gleich vielen Siegen steht vorn, wer seltener verloren hat."}[art];
  };
  const lade = async () => {
    stand.textContent = "Lade Rangliste …";
    try { await ranglisteMelden(); const neu = await ranglisteLaden(); if (!inhalt.isConnected) return; eintraege = neu; male(); }
    catch (e) { if (inhalt.isConnected) stand.replaceChildren("Die Rangliste ist gerade nicht erreichbar. ", h("button", {class:"textknopf", type:"button", onclick:lade}, "Noch einmal versuchen")); }
  };
  const fuss = h("p", {class:"einstieg klein"});
  const fussNormal = () => fuss.replaceChildren("Du spielst als " + G.name + ". ", h("button", {class:"textknopf", type:"button", onclick:() => inhalt.replaceChildren(namensKarte("Speichern"))}, "Name ändern"), " ",
    h("button", {class:"textknopf", type:"button", onclick:() => fuss.replaceChildren("Deinen Eintrag wirklich löschen? ",
      h("button", {class:"textknopf", type:"button", onclick:async () => { try { await ranglisteAustragen(); rangliste(); } catch (e) { fuss.replaceChildren("Das hat nicht geklappt. Versuch es später noch einmal."); } }}, "Ja, austragen"), " ",
      h("button", {class:"textknopf", type:"button", onclick:fussNormal}, "Abbrechen"))}, "Aus der Rangliste austragen"));
  fussNormal();
  inhalt.append(h("div", {class:"wahlreiter", role:"group", "aria-label":"Sortieren nach"}, reiter), stand, liste, fuss);
  lade();
}
/* Spielernamen wählen oder ändern. */
function namensKarte(knopftext){
  const feld = h("input", {class:"namensfeld", type:"text", maxlength:"16", value:G.name || null, autocomplete:"nickname", "aria-label":"Dein Spielername"}), fehler = h("p", {class:"leise klein", role:"status"});
  return h("form", {class:"karte namenskarte", onsubmit:e => { e.preventDefault(); const n = nameBereinigen(feld.value);
      if (!n){ fehler.textContent = "Der Name braucht 2 bis 16 Zeichen."; return; } G.name = n; sichern(); rangliste(); }},
    h("h2", null, "Dein Spielername"), h("p", null, "Unter diesem Namen stehst du in der Rangliste deines Kurses."),
    h("div", {class:"antwort"}, feld, h("button", {class:"knopf haupt", type:"submit"}, knopftext)), fehler,
    h("p", {class:"leise klein"}, "Dein Name, deine Figur, deine Chips und deine Antwortquote sind für alle sichtbar, die diese Rangliste öffnen. Es muss nicht dein echter Name sein. Austragen kannst du dich jederzeit."));
}

/* =====================================================================
   RUNDE: gemeinsamer Ablauf für Kapitel, Boss und Wiederholen
   Frage → Antwort → die Figur freut sich oder ist traurig → nächste Frage.
   Was falsch war, kommt am Ende noch einmal (zweite Chance, zählt nicht für das Bestehen).
   ===================================================================== */
let K = null;
function neueRunde(werte){ const r = Object.assign({nr:0, serie:0, serieMax:0, richtig:0, falsch:[], gerettet:0, zweite:false, erfahrung:0, phase:""}, werte); r.anzahl = r.aufgaben.length; return r; }
function starteRunde(kap, stufe){
  G.zuletzt = kap.thema.id;
  K = neueRunde({art:"kapitel", kap, stufe, titel:kap.titel + ", Stufe " + stufe, noetig:REGELN.bestehenAb[stufe - 1], aufgaben:waehleAufgaben(kap.aufgaben, REGELN.fragenProRunde, stufe)});
  rundenAnsicht(); naechsteFrage();
}
function starteBoss(thema){
  G.zuletzt = thema.id;
  K = neueRunde({art:"boss", boss:thema, stufe:3, titel:"Klausur-Boss", noetig:REGELN.bestehenBoss, aufgaben:waehleAufgaben(thema.kapitel.flatMap(k => k.aufgaben), REGELN.fragenBoss, 3)});
  rundenAnsicht(); naechsteFrage();
}
function starteWiederholen(nurFaelliges){
  const pool = nurFaelliges ? ALLE_AUFGABEN : KAPITEL.filter(gewaehlt).flatMap(k => k.aufgaben); if (!pool.length) return;
  K = neueRunde({art:"wiederholen", titel:"Wiederholen", noetig:0, aufgaben:waehleAufgaben(pool, REGELN.fragenWiederholen)});
  rundenAnsicht(); naechsteFrage();
}
function rundenAnsicht(){
  beginne("runde");
  const a = h("b"), b = h("b"), c = h("b");
  K.el = {frage:h("div", {class:"fragebox karte"}), figur:h("div", {class:"rundenfigur"}), a, b, c, aLabel:h("span", null, "Frage "), serie:h("span", {class:"pille serie"}, symbol("flamme", "orange"), b)};
  zeige(h("div", {class:"kampfkopf"}, h("button", {class:"knopf klein", type:"button", onclick:rundenEnde}, "Abbrechen"), h("span", {class:"kampftitel"}, K.titel)),
    h("div", {class:"runde"}, h("div", {class:"rundenseite"}, K.el.figur, h("p", {class:"kampfwerte"}, h("span", {class:"pille"}, K.el.aLabel, a), K.el.serie, h("span", {class:"pille"}, symbol("haken", "gruen"), c))), K.el.frage));
  maleFigur("ruhig"); maleWerte();
}
/* Die Figur in der Runde: ruhig, froh (hüpft) oder traurig (lässt den Kopf hängen). */
function maleFigur(laune){
  const gesicht = laune === "froh" ? {augen:"augen-lachend", mund:"mund-grinsen"} : laune === "traurig" ? {augen:"augen-muede", mund:"mund-schmollen"} : null;
  K.el.figur.replaceChildren(figurBild(gesicht ? Object.assign({}, G.tracht, gesicht) : G.tracht, "ganz", "gross " + laune));
}
function maleWerte(){
  K.el.aLabel.textContent = K.zweite ? "Zweite Chance " : "Frage "; K.el.a.textContent = Math.max(1, K.nr) + "/" + K.aufgaben.length;
  K.el.b.textContent = K.serie; K.el.c.textContent = K.richtig + (K.noetig ? "/" + K.noetig : ""); K.el.serie.classList.toggle("heiss", K.serie >= 3);
}
function naechsteFrage(){
  if (K.nr >= K.aufgaben.length){
    if (!K.zweite && K.falsch.length){ K.zweite = true; K.aufgaben = K.falsch.slice(); K.nr = 0; K.serie = 0; }     // zweite Chance für alles, was falsch war
    else return rundenEnde();
  }
  const a = K.jetzt = konkret(K.aufgaben[K.nr]); K.nr++; K.phase = "frage";
  const kopf = h("h2", {class:"frage", tabindex:"-1"}, a.frage || "Ergänze den Satz.");
  K.el.frage.replaceChildren(...[K.zweite ? h("p", {class:"marke2"}, "Zweite Chance") : null, kopf, AUFGABEN[a.typ](a, ok => beantwortet(a, ok))].filter(Boolean));
  K.el.frage.classList.remove("wackeln", "treffer"); maleFigur("ruhig");
  if (a.typ !== "eingabe") { try { kopf.focus({preventScroll:true}); } catch (e) {} }
  maleWerte(); window.scrollTo(0, 0);
}
function rueckmeldung(a, ok, zusatz, knoepfe){
  return h("div", {class:"rueck " + (ok ? "gut" : "schlecht"), role:"status"},
    h("p", {class:"urteil"}, ok ? "Richtig!" : "Nicht richtig"),
    ok || a.typ === "erklaeren" ? null : h("p", {class:"loesung"}, "Richtig ist: " + loesungText(a)),
    a.erklaerung ? h("p", null, a.erklaerung) : null,
    zusatz ? h("p", {class:"zusatz"}, zusatz) : null, h("div", {class:"aktionen"}, knoepfe));
}
function beantwortet(a, ok){
  tastenhaken = null; tagPruefen(); K.phase = "antwort";
  const warFaellig = verbuche(a, ok, K.zweite), e = REGELN.erfahrung, schwer = ANSPRUCH[K.aufgaben[K.nr - 1].typ] === 3;
  ton(ok ? "richtig" : "falsch"); K.el.frage.classList.add(ok ? "treffer" : "wackeln"); maleFigur(ok ? "froh" : "traurig");
  let zusatz = "";
  if (!K.zweite){
    if (ok){ K.richtig++; K.serie++; K.serieMax = Math.max(K.serieMax, K.serie); K.erfahrung += e.richtig + (schwer ? e.freiAbgerufen : 0); richtigGezaehlt(a, warFaellig, K.serie); if (K.serie >= 2) zusatz = K.serie + " richtige Antworten in Folge."; }
    else { K.serie = 0; K.falsch.push(K.aufgaben[K.nr - 1]); G.zaehler.falsch++; zusatz = "Am Ende bekommst du eine zweite Chance."; }
  } else if (ok){ K.gerettet++; K.erfahrung += e.zweiteChance; }
  else zusatz = "Die Aufgabe kommt laut Lernplan bald wieder.";
  sichern();
  const box = rueckmeldung(a, ok, zusatz, [h("button", {class:"knopf haupt", type:"button", onclick:naechsteFrage}, "Weiter")]);
  K.el.frage.append(box); maleWerte(); box.querySelector("button").focus();
}

/* =====================================================================
   ERGEBNIS: abrechnen und feiern
   ===================================================================== */
function rundenEnde(){
  if (!K || K.aus) return; K.aus = true;
  const e = REGELN.erfahrung, gefragt = K.richtig + K.falsch.length, gespielt = gefragt > 0, fertig = gefragt >= K.anzahl, anteil = K.richtig / K.anzahl;
  const erg = {art:K.art, titel:K.titel, offen:K.falsch, gerettet:K.gerettet, richtig:K.richtig, anzahl:K.anzahl, noetig:K.noetig, zeilen:[], weiter:[]};
  const bonus = REGELN.serieBonus * Math.max(0, K.serieMax - 1);
  beginne("ergebnis"); tagPruefen();
  if (K.art === "wiederholen"){
    erg.sieg = fertig && !K.falsch.length; erg.chips = Math.round(REGELN.wiederholenLohn * anteil) + bonus;
    if (gespielt){ G.zaehler.abwehr++; G.tag.abwehr++; K.erfahrung += e.wiederholen; }
    erg.kopf = erg.sieg ? "Alles gewusst!" : K.richtig + " von " + K.anzahl + " gewusst";
    erg.weiter.push(h("button", {class:"knopf haupt", type:"button", onclick:() => starteWiederholen(false)}, "Noch eine Runde"));
  } else {
    const sieg = erg.sieg = fertig && K.richtig >= K.noetig, k = K.kap, s = K.stufe;
    if (K.art === "boss"){
      const thema = K.boss, erster = sieg && G.boss[thema.id] !== wocheNr();
      erg.chips = Math.round(REGELN.beuteBoss * anteil) + bonus; erg.truhe = sieg ? {art:erster ? "gold" : "silber", mal:3} : null;
      if (sieg){ G.boss[thema.id] = wocheNr(); G.zaehler.boss++; G.zaehler.siege++; G.tag.siege++; K.erfahrung += e.sieg * 4; }
      erg.kopf = sieg ? "Boss besiegt!" : "Der Boss steht noch";
      erg.weiter.push(h("button", {class:"knopf haupt", type:"button", onclick:() => starteBoss(thema)}, sieg ? "Noch einmal" : "Gleich noch einmal"));
    } else {
      const vorher = G.sterne[k.id] || 0;
      erg.chips = Math.round(REGELN.beute[s - 1] * anteil) + bonus; erg.sterne = sieg ? Math.max(vorher, s) : vorher; erg.neuerStern = sieg && vorher < s; erg.truhe = sieg ? {art:truheWuerfeln(), mal:s} : null;
      if (sieg){ G.sterne[k.id] = erg.sterne; G.zaehler.siege++; G.tag.siege++; K.erfahrung += e.sieg * s + (erg.neuerStern ? e.neuerStern : 0); if (!K.falsch.length) G.zaehler.perfekt++; }
      erg.kopf = sieg ? (erg.neuerStern ? "Bestanden!" : "Wieder bestanden!") : K.richtig === K.noetig - 1 && fertig ? "Ganz knapp!" : "Noch nicht geschafft";
      if (sieg && s < 3) erg.weiter.push(h("button", {class:"knopf haupt", type:"button", onclick:() => starteRunde(k, s + 1)}, "Stufe " + (s + 1) + " spielen"));
      if (!sieg) erg.weiter.push(h("button", {class:"knopf haupt", type:"button", onclick:() => starteRunde(k, s)}, "Gleich noch einmal"));
    }
    if (!sieg) erg.zeilen.push(fertig ? "Zum Bestehen brauchst du " + K.noetig + " von " + K.anzahl + " Antworten auf Anhieb. Schau unten, was noch nicht saß." : "Die Runde wurde abgebrochen.");
    erg.weiter.push(h("button", {class:"knopf", type:"button", onclick:angriffsKarte}, "Zur Karte"));
  }
  erg.weiter.push(h("button", {class:"knopf", type:"button", onclick:heim}, "Fertig"));
  erg.erfahrung = K.erfahrung; gibChips(erg.chips);
  if (gespielt) rundeGespielt();
  gibXp(K.erfahrung); abzeichenPruefen(); sichern();
  if (gespielt) ranglisteMeldenLeise();
  ergebnisAnsicht(erg);
}
function ergebnisAnsicht(e){
  const titel = h("h1", {class:"ergebnis " + (e.sieg ? "sieg" : "knapp"), tabindex:"-1"}, e.kopf), chips = h("b"), xp = h("b");
  const laune = e.sieg ? {augen:"augen-lachend", mund:"mund-grinsen"} : {augen:"augen-muede", mund:"mund-schmollen"};
  const sterne = e.sterne != null ? h("div", {class:"sternreihe", role:"img", "aria-label":e.sterne + " von 3 Sternen"}, [1, 2, 3].map(i => symbol("stern", (i <= e.sterne ? "an" : "aus") + (e.neuerStern && i === e.sterne ? " neu" : "")))) : null;
  const balken = h("div", {class:"zerstoert"}, h("div", {class:"balken dick"}, h("i", {class:e.sieg ? "fest" : "", style:"width:" + Math.round(100 * e.richtig / e.anzahl) + "%"}), e.noetig ? h("span", {class:"marke", style:"left:" + Math.round(100 * e.noetig / e.anzahl) + "%"}) : null),
    h("p", {class:"leise"}, e.richtig + " von " + e.anzahl + " auf Anhieb richtig" + (e.noetig ? ", nötig sind " + e.noetig : "")));
  const truhe = e.truhe ? h("button", {class:"truhenknopf gross", type:"button", onclick:ev => { ev.currentTarget.remove(); truhenFenster(e.truhe.art, e.truhe.mal, "Deine Siegestruhe"); }}, truheBild("holz"), h("span", null, "Siegestruhe öffnen")) : null;
  const offen = e.offen.length ? h("section", null, h("h2", {class:"abschnitt"}, "Das saß beim ersten Versuch nicht"),
    h("p", {class:"leise"}, "Diese Aufgaben stehen heute noch einmal auf dem Lernplan." + (e.gerettet ? " " + e.gerettet + " davon hast du in der zweiten Chance geschafft." : "")),
    h("ul", {class:"liste"}, e.offen.map(roh => { const a = roh.typ === "rechnen" ? {frage:"Rechenaufgabe (" + roh.art + ")", typ:"rechnen"} : roh; return h("li", {class:"posten offen"},
      h("div", null, h("h3", null, a.frage || frageText(a)), a.typ === "rechnen" ? null : h("p", {class:"loesung"}, loesungText(a)), a.erklaerung ? h("p", null, a.erklaerung) : null)); }))) : null;
  zeige(h("div", {class:"ergebnisseite"}, h("p", {class:"kampftitel"}, e.titel), figurBild(Object.assign({}, G.tracht, laune), "ganz", "gross " + (e.sieg ? "froh" : "traurig")), titel, sterne, balken,
    h("ul", {class:"beute"}, h("li", null, symbol("daten", "gelb"), chips, " Chips"), h("li", null, symbol("stern", "blau"), xp, " Erfahrung")),
    truhe, e.zeilen.map(z => h("p", {class:"ergebniszeile"}, z)), h("div", {class:"aktionen mitte"}, e.weiter), offen));
  zaehleHoch(chips, 0, e.chips, "+"); zaehleHoch(xp, 0, e.erfahrung, "+");
  ton(e.sieg ? "sieg" : "verloren"); if (e.sieg) konfetti();
  try { titel.focus({preventScroll:true}); } catch (err) {}
  feiere();
}

/* Start: Lernstoff entsperren (falls verschlüsselt), prüfen und ordnen, Spielstand laden, dann die Startseite zeigen.
   Mit ?pruefen an der Adresse (oder ganz ohne gültigen Lernstoff) erscheint statt des Spiels die Übersicht aus lernstoff.js. */
/* Umzug: Die Seite lief früher unter einer netlify.app-Adresse. Wer sie dort noch öffnet, wird zur neuen Adresse geschickt.
   Das Kurs-Passwort aus dem Link (#k=…) wandert mit, es steht nicht in dieser Datei. */
const NEUE_ADRESSE = "https://lernapp-2.nosio.workers.dev/";
function umzugsHinweis(){
  if (!/(^|\.)netlify\.app$/.test(location.hostname)) return false;
  document.body.dataset.ansicht = "zugang";
  app.replaceChildren(h("section", {class:"karte zugang"}, h("h1", null, "Wir sind umgezogen"),
    h("p", null, "Das Lernspiel hat eine neue Adresse. Hier geht es nicht mehr weiter."),
    h("p", null, "Dein Spielstand zieht nicht mit um: Auf der neuen Seite fängst du neu an. Speichere dir den neuen Link."),
    h("div", {class:"aktionen"}, h("a", {class:"knopf haupt", href:NEUE_ADRESSE + location.hash}, "Zur neuen Seite")),
    h("p", {class:"leise klein"}, NEUE_ADRESSE)));
  return true;
}
async function start(){
  if (umzugsHinweis()) return;
  await lernstoffOeffnen(); await kursOrtBestimmen();
  bereiteLernstoffAuf();
  try { G = standAus(JSON.parse(localStorage.getItem(SPEICHER) || localStorage.getItem("chipdorf-v3") || "null")) || G; } catch (e) {}
  if (!KAPITEL.length || /[?&]pruefen\b/.test(location.search)){ document.body.dataset.ansicht = "bericht"; app.replaceChildren(lernstoffBericht()); }
  else { tagPruefen(); sichern(); heim(); neuesFenster(false); }
}
start();
