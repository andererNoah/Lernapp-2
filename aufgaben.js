"use strict";
/* =====================================================================
   AUFGABENTYPEN
   Jeder Typ ist eine Funktion AUFGABEN[typ](aufgabe, fertig):
   Sie baut die Bedienelemente und ruft fertig(true|false) genau einmal auf.
   Ein neuer Typ braucht nur einen Eintrag hier und in loesungText().
   Das Spiel selbst (spiel.js) weiß nichts über einzelne Typen.
   ===================================================================== */

const TYPNAME = {wahl:"Auswahl", wahrfalsch:"Wahr oder falsch", luecke:"Lückentext", gruppen:"Einsortieren", reihenfolge:"Reihenfolge",
  paare:"Zuordnen", schema:"Schaubild", eingabe:"Eingabe", schalter:"Schalter", tabelle:"Wahrheitstabelle", rechnen:"Rechnen", erklaeren:"Erklären"};

/* Text der Frage, auch für Listen im Ergebnis. */
function frageText(a){
  if (a.frage) return a.frage;
  if (a.typ === "luecke") return a.text.replace(/\{[^}]+\}/g, "___");
  if (a.typ === "rechnen") return "Rechenaufgabe: " + a.art;
  return "";
}
/* Die richtige Lösung als Text. */
function loesungText(a){
  switch (a.typ){
    case "wahl": return a.antworten[0];
    case "wahrfalsch": return a.stimmt ? "Die Aussage stimmt." : "Die Aussage stimmt nicht.";
    case "luecke": return a.text.replace(/[{}]/g, "");
    case "gruppen": return Object.entries(a.gruppen).map(([g, w]) => g + ": " + w.join(", ")).join(". ") + ".";
    case "reihenfolge": return a.schritte.map((s, i) => (i + 1) + ". " + s).join("  ");
    case "paare": return a.paare.map(p => p[0] + ": " + p[1]).join("; ");
    case "schema": return a.zeilen.map(z => z.filter(Boolean).map(c => c.replace(/^\?/, "")).join(" ")).join(" / ");
    case "eingabe": return a.zahl != null ? komma(a.zahl) + (a.einheit ? " " + a.einheit : "") : a.text[0];
    case "schalter": return gruppiert(a.bits);
    case "tabelle": return "Y = " + a.ausgang.join(", ") + " (für A B = 00, 01, 10, 11)";
    case "erklaeren": return a.punkte.join("; ") + ".";
  }
  return "";
}
const gruppiert = bits => bits.replace(/(\d{4})(?=\d)/g, "$1 ");
const acht = n => n.toString(2).padStart(8, "0");

/* Gemeinsame Bausteine ------------------------------------------------ */

/* Eine Zeile zum Antippen mit einem Feld davor (Nummer, Haken, Kreuz). */
function zeile(marke, text, klick){
  const feld = h("span", {class:"marke", "aria-hidden":"true"}, marke);
  const knopf = h("button", {class:"wahlzeile", type:"button", onclick:klick}, feld, h("span", null, text));
  knopf.feld = feld; return knopf;
}
/* Lücken mit Wortbank: benutzt von "luecke" und "schema". */
function neueLuecke(luecken, erlaubt, soll){
  const l = {erlaubt, soll, wort:null};
  l.el = h("button", {class:"luecke", type:"button", "aria-label":"Lücke, leer", onclick:() => { if (l.wort && l.frei) l.frei(); }});
  luecken.push(l); return l.el;
}
function wortbank(luecken, falsch, fertig){
  const woerter = mischen(luecken.map(l => l.soll).concat(falsch || []));
  const pruefen = h("button", {class:"knopf haupt", type:"button", disabled:true, onclick:auswerten}, "Prüfen");
  const chips = woerter.map(w => h("button", {class:"chip", type:"button", onclick:e => setzen(w, e.currentTarget)}, w));
  function setzen(wort, chip){
    const l = luecken.find(x => !x.wort); if (!l) return;
    l.wort = wort; l.el.textContent = wort; l.el.classList.add("voll"); l.el.setAttribute("aria-label", "Lücke: " + wort + ". Antippen zum Entfernen.");
    chip.disabled = true;
    l.frei = () => { l.wort = null; l.el.textContent = ""; l.el.classList.remove("voll"); l.el.setAttribute("aria-label", "Lücke, leer"); chip.disabled = false; pruefen.disabled = true; };
    pruefen.disabled = luecken.some(x => !x.wort);
  }
  function auswerten(){
    let ok = true;
    for (const l of luecken){ const r = l.erlaubt.includes(l.wort); if (!r) ok = false; l.el.classList.add(r ? "gut" : "schlecht"); l.el.disabled = true; }
    box.remove(); fertig(ok);
  }
  const box = h("div", null, h("div", {class:"bank", role:"group", "aria-label":"Wörter zur Auswahl"}, chips), h("div", {class:"aktionen"}, pruefen));
  return box;
}

/* Die Typen ----------------------------------------------------------- */
const AUFGABEN = {

  /* Auswahl: eine von vier Antworten. In der Inhaltsdatei steht die richtige zuerst. */
  wahl(a, fertig){
    const opt = mischen(a.antworten.map((text, i) => ({text, richtig:i === 0})));
    let zu = false;
    const knoepfe = opt.map((o, i) => zeile(i + 1, o.text, () => waehle(i)));
    function waehle(i){
      if (zu) return; zu = true;
      knoepfe.forEach((k, j) => { k.disabled = true; if (opt[j].richtig){ k.classList.add("gut"); k.feld.textContent = "✓"; } });
      if (!opt[i].richtig){ knoepfe[i].classList.add("schlecht"); knoepfe[i].feld.textContent = "✗"; }
      fertig(opt[i].richtig);
    }
    tastenhaken = e => { const n = parseInt(e.key, 10); if (n >= 1 && n <= knoepfe.length) waehle(n - 1); };
    return h("div", {class:"wahlliste"}, knoepfe);
  },

  /* Wahr oder falsch: eine Aussage beurteilen. */
  wahrfalsch(a, fertig){
    let zu = false;
    const ja = h("button", {class:"knopf gross", type:"button", onclick:() => waehle(true)}, "Stimmt");
    const nein = h("button", {class:"knopf gross", type:"button", onclick:() => waehle(false)}, "Stimmt nicht");
    function waehle(v){
      if (zu) return; zu = true; ja.disabled = nein.disabled = true;
      (a.stimmt ? ja : nein).classList.add("gut"); if (v !== a.stimmt) (v ? ja : nein).classList.add("schlecht");
      fertig(v === a.stimmt);
    }
    tastenhaken = e => { if (e.key === "1") waehle(true); if (e.key === "2") waehle(false); };
    return h("div", null, h("p", {class:"anleitung"}, "Stimmt diese Aussage?"), h("div", {class:"zweier"}, ja, nein));
  },

  /* Lückentext: Wörter aus der Bank in die Lücken setzen. */
  luecke(a, fertig){
    const luecken = [], teile = a.text.split(/\{([^}]+)\}/);          // ungerade Stellen sind die Lösungen
    const satz = h("p", {class:"lueckentext"}, teile.map((t, i) => i % 2 ? neueLuecke(luecken, [t], t) : t));
    return h("div", null, h("p", {class:"anleitung"}, "Tippe die passenden Wörter an. Ein Tipp auf eine gefüllte Lücke nimmt das Wort wieder heraus."), satz, wortbank(luecken, a.falsch, fertig));
  },

  /* Schaubild: wie Lückentext, aber als Raster aus Kästen. */
  schema(a, fertig){
    const luecken = [], spalten = Math.max(...a.zeilen.map(z => z.length));
    const zellen = a.zeilen.flatMap(z => {
      const inZeile = z.filter(c => c.startsWith("?")).map(c => c.slice(1));
      const voll = z.concat(Array(spalten - z.length).fill(""));
      return voll.map(c => c.startsWith("?") ? h("div", {class:"zelle"}, neueLuecke(luecken, a.egal ? inZeile : [c.slice(1)], c.slice(1)))
        : h("div", {class:"zelle" + (c ? (/^[→←↑↓|—]$/.test(c) ? " pfeil" : " fest") : " leer")}, c));
    });
    const pfeil = c => /^[→←↑↓|—]$/.test(c);                    // Spalten nur aus Pfeilen bleiben schmal
    const raster = Array.from({length:spalten}, (_, i) => a.zeilen.every(z => !z[i] || pfeil(z[i])) && a.zeilen.some(z => z[i]) ? "22px" : "minmax(0,1fr)").join(" ");
    return h("div", null, h("p", {class:"anleitung"}, "Setze die Begriffe an die richtige Stelle." + (a.egal ? " Innerhalb einer Zeile ist die Reihenfolge egal." : "")),
      h("div", {class:"schema", style:"--raster:" + raster}, zellen), wortbank(luecken, a.falsch, fertig));
  },

  /* Einsortieren: Begriffe nacheinander einer Gruppe zuordnen (höchstens sechs pro Runde). */
  gruppen(a, fertig){
    const namen = Object.keys(a.gruppen), alle = namen.flatMap(n => a.gruppen[n].map(w => ({w, n})));
    const pflicht = namen.map(n => mischen(alle.filter(x => x.n === n))[0]);            // aus jeder Gruppe mindestens einer
    const karten = mischen(pflicht.concat(mischen(alle.filter(x => !pflicht.includes(x)))).slice(0, 6));
    let i = 0, sauber = true;
    const karte = h("p", {class:"begriff"}), stand = h("p", {class:"anleitung"}), protokoll = h("ul", {class:"protokoll"});
    const knoepfe = namen.map(n => h("button", {class:"knopf gross", type:"button", onclick:() => waehle(n)}, n));
    const reihe = h("div", {class:"zweier"}, knoepfe);
    function zeige(){ karte.textContent = karten[i].w; stand.textContent = "Wohin gehört das? Karte " + (i + 1) + " von " + karten.length + "."; }
    function waehle(n){
      const k = karten[i], ok = k.n === n; if (!ok) sauber = false;
      protokoll.prepend(h("li", {class:ok ? "gut" : "schlecht"}, h("span", {"aria-hidden":"true"}, ok ? "✓ " : "✗ "), k.w + " gehört zu „" + k.n + "“"));
      if (++i < karten.length) return zeige();
      karte.remove(); stand.remove(); reihe.remove(); fertig(sauber);
    }
    tastenhaken = e => { const n = parseInt(e.key, 10); if (n >= 1 && n <= namen.length && i < karten.length) waehle(namen[n - 1]); };
    zeige();
    return h("div", null, stand, karte, reihe, protokoll);
  },

  /* Reihenfolge: Einträge der Reihe nach antippen. */
  reihenfolge(a, fertig){
    const teile = mischenAnders(a.schritte.map((text, platz) => ({text, platz}))), folge = [];
    const knoepfe = teile.map((t, i) => zeile("", t.text, () => tippe(i)));
    const pruefen = h("button", {class:"knopf haupt", type:"button", disabled:true, onclick:auswerten}, "Reihenfolge prüfen");
    function male(){
      knoepfe.forEach((k, i) => { const p = folge.indexOf(i); k.feld.textContent = p >= 0 ? p + 1 : ""; k.feld.classList.toggle("leer", p < 0);
        k.setAttribute("aria-label", teile[i].text + (p >= 0 ? ", Position " + (p + 1) : ", noch nicht einsortiert")); });
      pruefen.disabled = folge.length !== teile.length;
    }
    function tippe(i){ const p = folge.indexOf(i); if (p >= 0) folge.splice(p, 1); else folge.push(i); male(); }
    function auswerten(){
      let ok = true;
      folge.forEach((i, p) => { const r = teile[i].platz === p; if (!r) ok = false; knoepfe[i].classList.add(r ? "gut" : "schlecht"); });
      knoepfe.forEach(k => k.disabled = true); pruefen.remove(); fertig(ok);
    }
    male();
    return h("div", null, h("p", {class:"anleitung"}, "Tippe die Einträge der Reihe nach an. Ein zweiter Tipp nimmt einen Eintrag wieder heraus."),
      h("div", {class:"wahlliste"}, knoepfe), h("div", {class:"aktionen"}, pruefen));
  },

  /* Zuordnen: zu jedem Begriff die passende Antwort wählen. */
  paare(a, fertig){
    const links = mischen(a.paare.map((p, i) => ({l:p[0], r:p[1], i}))), rechts = mischen(a.paare.map((p, i) => ({r:p[1], i}))), n = links.length;
    let jetzt = 0, sauber = true;
    const stand = h("p", {class:"anleitung"}), begriff = h("p", {class:"begriff"}), hinweis = h("p", {class:"anleitung", role:"status"});
    const knoepfe = rechts.map((o, j) => { const k = zeile("", o.r, () => waehle(j)); k.feld.classList.add("leer"); k.text = k.lastChild; return k; });
    function male(){ stand.textContent = "Was passt dazu? Zuordnung " + (jetzt + 1) + " von " + n + "."; begriff.textContent = links[jetzt].l; }
    function fest(j, l){ const k = knoepfe[j]; k.disabled = true; k.classList.remove("schlecht"); k.classList.add("gut"); k.feld.classList.remove("leer"); k.feld.textContent = "✓"; k.text.textContent = l.l + ": " + l.r; }
    function waehle(j){
      const l = links[jetzt];
      if (rechts[j].i !== l.i){ sauber = false; knoepfe[j].classList.add("schlecht"); hinweis.textContent = "„" + rechts[j].r + "“ passt nicht zu " + l.l + ". Versuch es noch einmal."; return; }
      knoepfe.forEach(k => k.classList.remove("schlecht")); hinweis.textContent = ""; fest(j, l); jetzt++;
      if (jetzt === n - 1){ const letzter = links[jetzt]; fest(rechts.findIndex(r => r.i === letzter.i), letzter); jetzt++; }
      if (jetzt >= n){ stand.remove(); begriff.remove(); hinweis.remove(); fertig(sauber); } else male();
    }
    male();
    return h("div", null, stand, begriff, h("div", {class:"wahlliste"}, knoepfe), hinweis);
  },

  /* Eingabe: eine Zahl oder ein kurzer Text. */
  eingabe(a, fertig){
    const feld = h("input", {class:"feld", type:"text", inputmode:a.zahl != null ? "decimal" : "text", autocomplete:"off", autocapitalize:"off", spellcheck:"false", "aria-label":"Deine Antwort"});
    const knopf = h("button", {class:"knopf haupt", type:"submit"}, "Antwort prüfen");
    const form = h("form", {class:"antwort", onsubmit:e => {
      e.preventDefault(); if (!feld.value.trim()){ feld.focus(); return; }
      const ok = eingabeStimmt(a, feld.value); feld.disabled = true; knopf.remove(); feld.classList.add(ok ? "gut" : "schlecht"); fertig(ok);
    }}, feld, a.einheit ? h("span", {class:"einheit"}, a.einheit) : null, knopf);
    setTimeout(() => { try { feld.focus({preventScroll:true}); } catch (e) {} }, 0);
    return form;
  },

  /* Schalter: acht Bits einstellen. */
  schalter(a, fertig){
    const werte = [128, 64, 32, 16, 8, 4, 2, 1], stand = Array(8).fill(0), alle = [];
    const spalten = werte.map((w, i) => {
      const ziffer = h("span", {class:"ziffer", "aria-hidden":"true"}, "0");
      const s = h("button", {class:"schalter", type:"button", "aria-pressed":"false", "aria-label":"Schalter mit Stellenwert " + w,
        onclick:() => { stand[i] ^= 1; s.setAttribute("aria-pressed", stand[i] ? "true" : "false"); ziffer.textContent = stand[i]; }}, h("span", {class:"hebel"}));
      alle.push(s);
      return h("div", {class:"spalte"}, h("span", {class:"wert", "aria-hidden":"true"}, w), s, ziffer);
    });
    const deins = h("p", {class:"anleitung"});
    const pruefen = h("button", {class:"knopf haupt", type:"button", onclick:() => {
      const ist = stand.join(""); alle.forEach(s => s.disabled = true); pruefen.remove(); deins.textContent = "Deine Schalter: " + gruppiert(ist); fertig(ist === a.bits);
    }}, "Schalter prüfen");
    return h("div", null, h("p", {class:"anleitung"}, "Schalter oben bedeutet 1, unten 0. Über jedem Schalter steht sein Stellenwert."),
      h("div", {class:"schalterbank", role:"group", "aria-label":"Acht Schalter, höchstes Bit links"}, spalten), deins, h("div", {class:"aktionen"}, pruefen));
  },

  /* Erklären: offene Frage wie in der Klausur. Erst selbst antworten, dann die Musterlösung
     aufdecken und Punkt für Punkt abhaken. Gelöst ab 70 % der Punkte. */
  erklaeren(a, fertig){
    const feld = h("textarea", {class:"freitext", rows:"4", placeholder:"Deine Antwort in Stichpunkten (wird nicht gespeichert)", "aria-label":"Deine Antwort"});
    const zeigen = h("button", {class:"knopf haupt", type:"button", onclick:aufdecken}, "Lösung aufdecken");
    const box = h("div", null, h("p", {class:"anleitung"}, "Antworte erst selbst: Schreib Stichpunkte auf oder sag es laut. Decke dann die Lösung auf."), feld, h("div", {class:"aktionen"}, zeigen));
    function aufdecken(){
      zeigen.parentNode.remove(); feld.readOnly = true;
      const noetig = Math.ceil(a.punkte.length * .7), stand = h("p", {class:"anleitung"});
      const anzahl = () => haken.filter(k => k.getAttribute("aria-pressed") === "true").length;
      const male = () => { stand.textContent = anzahl() + " von " + a.punkte.length + " Punkten abgehakt. Gelöst ist die Aufgabe ab " + noetig + "."; };
      const haken = a.punkte.map(p => { const k = zeile("", p, () => { const an = k.getAttribute("aria-pressed") !== "true"; k.setAttribute("aria-pressed", String(an)); k.feld.textContent = an ? "✓" : ""; k.feld.classList.toggle("leer", !an); k.classList.toggle("gewaehlt", an); male(); });
        k.setAttribute("aria-pressed", "false"); k.feld.classList.add("leer"); return k; });
      const ende = h("button", {class:"knopf haupt", type:"button", onclick:() => { const n = anzahl(); haken.forEach(k => k.disabled = true); ende.parentNode.remove(); fertig(n >= noetig); }}, "Fertig");
      male();
      box.append(h("p", {class:"anleitung"}, "Das ist die Musterlösung. Hake ehrlich ab, was in deiner Antwort vorkam."), h("div", {class:"wahlliste"}, haken), stand, h("div", {class:"aktionen"}, ende));
    }
    return box;
  },

  /* Wahrheitstabelle: für jede Zeile den Ausgang wählen. */
  tabelle(a, fertig){
    const eing = [[0,0],[0,1],[1,0],[1,1]], wahl = [null, null, null, null], zeilen = [];
    const pruefen = h("button", {class:"knopf haupt", type:"button", disabled:true, onclick:() => {
      let ok = true;
      zeilen.forEach((tr, r) => { const gut = wahl[r] === a.ausgang[r]; if (!gut) ok = false; tr.classList.add(gut ? "gut" : "schlecht"); tr.querySelectorAll("button").forEach(b => b.disabled = true); });
      pruefen.remove(); fertig(ok);
    }}, "Tabelle prüfen");
    const rumpf = eing.map((e, r) => {
      const b0 = h("button", {type:"button", "aria-pressed":"false", "aria-label":"Y gleich 0 für A " + e[0] + ", B " + e[1], onclick:() => setze(0)}, "0");
      const b1 = h("button", {type:"button", "aria-pressed":"false", "aria-label":"Y gleich 1 für A " + e[0] + ", B " + e[1], onclick:() => setze(1)}, "1");
      function setze(v){ wahl[r] = v; b0.setAttribute("aria-pressed", v === 0); b1.setAttribute("aria-pressed", v === 1); pruefen.disabled = wahl.includes(null); }
      const tr = h("tr", null, h("td", null, e[0]), h("td", null, e[1]), h("td", null, h("span", {class:"umschalter"}, b0, b1)));
      zeilen.push(tr); return tr;
    });
    return h("div", null, h("p", {class:"anleitung"}, "Wähle für jede Zeile den Ausgang Y."),
      h("table", {class:"wahrheit"}, h("thead", null, h("tr", null, h("th", null, "A"), h("th", null, "B"), h("th", null, "Y"))), h("tbody", null, rumpf)), h("div", {class:"aktionen"}, pruefen));
  }
};

function eingabeStimmt(a, roh){
  let s = String(roh).trim().toLowerCase().replace(/\s+/g, "").replace(/[−–]/g, "-");
  if (a.zahl != null){
    s = s.replace(/[a-zäöüß€%\/]+$/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(s)) return false;
    return Math.abs(parseFloat(s) - a.zahl) <= (a.toleranz || 0) + 1e-9;
  }
  s = s.replace(/^0x/, "").replace(/h$/, "");
  return a.text.some(t => t.toLowerCase().replace(/\s+/g, "") === s);   // Leerzeichen zählen nicht
}

/* Rechenaufgaben werden bei jedem Aufruf mit neuen Zahlen erzeugt. ------- */
const HEX = n => n.toString(16).toUpperCase();
const potenzen = n => [128, 64, 32, 16, 8, 4, 2, 1].filter(w => n & w).join(" + ");
const hexZiffer = d => d > 9 ? "0123456789ABCDEF"[d] + " steht für " + d + ". " : "";
function erzeugeRechnen(art){
  const n = zufall(17, 255), hi = n >> 4, lo = n & 15, m = zufall(1, 127);
  switch (art){
    case "dez-dual": return {typ:"schalter", frage:"Stelle die Dezimalzahl " + n + " als Dualzahl ein.", bits:acht(n), erklaerung:n + " = " + potenzen(n) + ", also " + gruppiert(acht(n)) + "₂."};
    case "dual-dez": return {typ:"eingabe", frage:"Welche Dezimalzahl ist " + gruppiert(acht(n)) + "₂?", zahl:n, erklaerung:potenzen(n) + " = " + n + "."};
    case "hex-dez": return {typ:"eingabe", frage:"Welche Dezimalzahl ist 0x" + HEX(n) + "?", zahl:n, erklaerung:hexZiffer(hi) + (lo !== hi ? hexZiffer(lo) : "") + hi + " · 16 + " + lo + " = " + n + "."};
    case "dez-hex": return {typ:"eingabe", frage:"Wie lautet " + n + " hexadezimal?", text:[HEX(n)], erklaerung:n + " : 16 = " + hi + " Rest " + lo + ". " + hexZiffer(hi) + (lo !== hi ? hexZiffer(lo) : "") + "Also 0x" + HEX(n) + "."};
    case "zweier": return {typ:"schalter", frage:"Stelle −" + m + " als 8-Bit-Zweierkomplement ein.", bits:acht(256 - m), erklaerung:"+" + m + " = " + gruppiert(acht(m)) + ", invertiert " + gruppiert(acht(255 - m)) + ", plus 1 = " + gruppiert(acht(256 - m)) + "."};
    default: return {typ:"eingabe", frage:"Das 8-Bit-Zweierkomplement " + gruppiert(acht(256 - m)) + " steht für welche Dezimalzahl?", zahl:-m,
      erklaerung:"Das höchste Bit ist 1, die Zahl ist also negativ. Invertieren und 1 addieren ergibt " + gruppiert(acht(m)) + " = " + m + ". Gesucht ist −" + m + "."};
  }
}
/* Macht aus einer Aufgabe der Inhaltsdatei die Aufgabe, die gestellt wird. */
function konkret(a){ return a.typ === "rechnen" ? Object.assign(erzeugeRechnen(a.art), {id:a.id}) : a; }
