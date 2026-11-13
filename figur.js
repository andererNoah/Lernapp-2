"use strict";
/* =====================================================================
   FIGUR: dein Charakter und sein Kleiderschrank.

   KATALOG   alles, was es gibt. Jedes Teil hat:
               id     fest, daran hängt, was Spieler gekauft haben (nie ändern)
               platz  wo es sitzt (PLAETZE)
               name, preis (0 = von Anfang an da), selten (0 gewöhnlich … 3 legendär)
               dazu, was der Zeichner braucht (form, farbe, motiv …)
   figurSvg  zeichnet eine Figur aus einer Tracht {platz: id} als Vektorgrafik.

   Neue Teile: eine Zeile im Katalog. Preise: nur die Zahl ändern.
   Diese Datei kennt weder Spielstand noch Oberfläche.
   ===================================================================== */

const PLAETZE = [["oben", "Oberteil"], ["unten", "Hose"], ["schuhe", "Schuhe"], ["kopf", "Kopf"], ["brille", "Brille"], ["extra", "Extra"], ["hinter", "Hintergrund"],
  ["haare", "Frisur"], ["haarfarbe", "Haarfarbe"], ["augen", "Augen"], ["mund", "Mund"], ["bart", "Bart"], ["haut", "Haut"]];
const SELTENHEIT = ["Gewöhnlich", "Selten", "Episch", "Legendär"];
const STOFF = {weiss:["Weiß", "#F4F1EA"], schwarz:["Schwarz", "#33333D"], grau:["Grau", "#9AA3AE"], rot:["Rot", "#E5533D"], orange:["Orange", "#F28C28"], gelb:["Gelb", "#F7C948"], gruen:["Grün", "#4FB06D"],
  tuerkis:["Türkis", "#2FB8A6"], blau:["Blau", "#3F7FE0"], marine:["Marine", "#27407A"], lila:["Lila", "#8B5CF6"], pink:["Pink", "#EC6FA9"], braun:["Braun", "#8A5A30"], beige:["Beige", "#D9C3A0"]};
const HAARTON = {schwarz:["Schwarz", "#2B2B33"], dunkelbraun:["Dunkelbraun", "#4A3222"], braun:["Braun", "#7A4E2A"], blond:["Blond", "#E8C36A"], rot:["Rot", "#C0502A"], grau:["Grau", "#B8BCC4"]};

const KATALOG = [];
(function fuelleKatalog(){
  const neu = (platz, id, name, preis, selten, mehr) => KATALOG.push(Object.assign({id:platz + "-" + id, platz, name, preis, selten:selten || 0}, mehr));
  const stoffe = (liste, f) => liste.forEach(k => f(k, STOFF[k][0], STOFF[k][1]));
  const alle = Object.keys(STOFF);
  /* Haut, Frisur, Haarfarbe, Gesicht */
  ["#FCE2C8", "#F3CBA5", "#E0AC7E", "#C68A5B", "#9A6240", "#6E4329"].forEach((f, i) => neu("haut", "t" + (i + 1), "Hautton " + (i + 1), 0, 0, {farbe:f}));
  [["kurz", "Kurz", 0], ["scheitel", "Seitenscheitel", 0], ["lang", "Lang", 0], ["glatze", "Glatze", 0], ["bob", "Bob", 300], ["locken", "Locken", 300], ["zopf", "Pferdeschwanz", 300], ["dutt", "Dutt", 400],
    ["igel", "Igel", 500], ["afro", "Afro", 600], ["undercut", "Undercut", 800], ["iro", "Irokese", 2500, 1]].forEach(([id, name, preis, s]) => neu("haare", id, name, preis, s, {form:id}));
  Object.keys(HAARTON).forEach(k => neu("haarfarbe", k, HAARTON[k][0], 0, 0, {farbe:HAARTON[k][1]}));
  [["blau", "Blau gefärbt", "#3F7FE0"], ["pink", "Pink gefärbt", "#EC6FA9"], ["gruen", "Grün gefärbt", "#4FB06D"], ["weiss", "Platinblond", "#F4F1EA"]].forEach(([id, name, f]) => neu("haarfarbe", id, name, 1500, 1, {farbe:f}));
  neu("haarfarbe", "regenbogen", "Regenbogen", 12000, 2, {farbe:"regenbogen"});
  [["normal", "Normal", 0], ["gross", "Groß", 0], ["lachend", "Lachend", 200], ["muede", "Müde", 200], ["zwinkern", "Zwinkern", 400], ["sterne", "Sternenaugen", 3000, 1]].forEach(([id, name, preis, s]) => neu("augen", id, name, preis, s, {form:id}));
  [["laecheln", "Lächeln", 0], ["grinsen", "Grinsen", 0], ["neutral", "Neutral", 0], ["staunen", "Staunen", 200], ["schmollen", "Schmollen", 200], ["zunge", "Zunge raus", 600]].forEach(([id, name, preis]) => neu("mund", id, name, preis, 0, {form:id}));
  [["keiner", "Kein Bart", 0], ["stoppeln", "Stoppeln", 300], ["schnurrbart", "Schnurrbart", 600], ["kinnbart", "Kinnbart", 600], ["vollbart", "Vollbart", 900]].forEach(([id, name, preis]) => neu("bart", id, name, preis, 0, {form:id}));
  /* Brille */
  [["keine", "Keine Brille", 0], ["rund", "Runde Brille", 400], ["eckig", "Eckige Brille", 400], ["nerd", "Nerdbrille", 800], ["sonne", "Sonnenbrille", 1500], ["herz", "Herzbrille", 2500, 1], ["vr", "VR-Brille", 9000, 2], ["pixel", "Pixel-Sonnenbrille", 15000, 2]]
    .forEach(([id, name, preis, s]) => neu("brille", id, name, preis, s, {form:id}));
  /* Oberteile */
  stoffe(alle.slice(0, 12), (k, n, f) => neu("oben", "tshirt-" + k, "T-Shirt " + n, k === "weiss" ? 0 : 150, 0, {form:"tshirt", farbe:f}));
  stoffe(alle.slice(0, 12), (k, n, f) => neu("oben", "pulli-" + k, "Pulli " + n, 450, 0, {form:"pulli", farbe:f}));
  stoffe(alle.slice(0, 12), (k, n, f) => neu("oben", "hoodie-" + k, "Hoodie " + n, 800, 0, {form:"hoodie", farbe:f}));
  stoffe(["weiss", "blau", "schwarz", "rot", "gruen", "pink"], (k, n, f) => neu("oben", "hemd-" + k, "Hemd " + n, 600, 0, {form:"hemd", farbe:f}));
  [["leder", "Lederjacke", "#33333D", 2500], ["jeans", "Jeansjacke", "#5B8FD6", 1800], ["bomber", "Bomberjacke", "#5E7F4A", 2000], ["college", "Collegejacke", "#C0392B", 2200], ["blazer", "Blazer", "#27407A", 2000]]
    .forEach(([id, name, f, preis]) => neu("oben", "jacke-" + id, name, preis, 1, {form:"jacke", farbe:f}));
  [["blau", "weiss"], ["rot", "weiss"], ["schwarz", "gelb"], ["gruen", "beige"], ["lila", "pink"]].forEach(([a, b]) => neu("oben", "streifen-" + a, "Streifenpulli " + STOFF[a][0], 1200, 0, {form:"pulli", farbe:STOFF[a][1], streifen:STOFF[b][1]}));
  [["blitz", "Blitz-Pulli", "gelb", 2500], ["herz", "Herz-Pulli", "weiss", 2500], ["stern", "Stern-Pulli", "marine", 2500], ["binaer", "Binär-Pulli", "schwarz", 3000], ["code", "Code-Pulli", "grau", 3000], ["404", "404-Pulli", "weiss", 3500],
    ["smiley", "Smiley-Pulli", "tuerkis", 2800], ["sudo", "sudo-Pulli", "schwarz", 4000], ["pi", "Pi-Pulli", "lila", 3200], ["wlan", "WLAN-Pulli", "blau", 3200], ["kaffee", "Kaffee-Pulli", "beige", 3000], ["bug", "Bug-Pulli", "gruen", 4500]]
    .forEach(([id, name, k, preis]) => neu("oben", "motiv-" + id, name, preis, 1, {form:"pulli", farbe:STOFF[k][1], motiv:id}));
  neu("oben", "platine", "Platinen-Pulli", 9000, 2, {form:"pulli", farbe:"#2F8A63", muster:"platine"});
  neu("oben", "bluescreen", "Bluescreen-Hoodie", 12000, 2, {form:"hoodie", farbe:"#1F5FD0", motiv:"bluescreen"});
  neu("oben", "matrix", "Matrix-Hoodie", 14000, 2, {form:"hoodie", farbe:"#10151A", muster:"matrix"});
  neu("oben", "regenbogen", "Regenbogen-Pulli", 16000, 2, {form:"pulli", farbe:"#fff", muster:"regenbogen"});
  neu("oben", "glitch", "Glitch-Pulli", 20000, 2, {form:"pulli", farbe:"#C9CED6", muster:"glitch"});
  neu("oben", "hacker", "Hacker-Hoodie", 24000, 3, {form:"hoodie", farbe:"#15181D", motiv:"prompt"});
  neu("oben", "galaxie", "Galaxie-Hoodie", 30000, 3, {form:"hoodie", farbe:"#2B1B5A", muster:"galaxie"});
  neu("oben", "gold", "Goldener Pulli", 50000, 3, {form:"pulli", farbe:"#F5C542", muster:"gold"});
  /* Hosen */
  [["jeans", "Jeans", "#4E79C4", 0], ["jeans-hell", "Helle Jeans", "#8FB3E8", 200], ["jeans-dunkel", "Dunkle Jeans", "#2D4A85", 200], ["jeans-schwarz", "Schwarze Jeans", "#33333D", 200]].forEach(([id, name, f, preis]) => neu("unten", id, name, preis, 0, {form:"lang", farbe:f}));
  stoffe(["beige", "braun", "grau", "gruen", "marine", "weiss"], (k, n, f) => neu("unten", "chino-" + k, "Chino " + n, 300, 0, {form:"lang", farbe:f}));
  stoffe(["grau", "schwarz", "rot", "blau", "lila"], (k, n, f) => neu("unten", "jogger-" + k, "Jogginghose " + n, 500, 0, {form:"jogger", farbe:f}));
  stoffe(["beige", "blau", "schwarz", "rot", "gruen", "gelb"], (k, n, f) => neu("unten", "shorts-" + k, "Shorts " + n, 250, 0, {form:"kurz", farbe:f}));
  stoffe(["schwarz", "rot", "blau", "pink", "gelb"], (k, n, f) => neu("unten", "rock-" + k, "Rock " + n, 400, 0, {form:"rock", farbe:f}));
  neu("unten", "karo", "Karohose", 1800, 1, {form:"lang", farbe:"#C0392B", muster:"karo"});
  neu("unten", "cargo-gruen", "Cargohose Oliv", 900, 0, {form:"cargo", farbe:"#6B7F4A"}); neu("unten", "cargo-schwarz", "Cargohose Schwarz", 900, 0, {form:"cargo", farbe:"#33333D"});
  neu("unten", "platine", "Platinen-Hose", 8000, 2, {form:"lang", farbe:"#2F8A63", muster:"platine"});
  neu("unten", "galaxie", "Galaxie-Hose", 20000, 3, {form:"lang", farbe:"#2B1B5A", muster:"galaxie"});
  neu("unten", "gold", "Goldene Hose", 25000, 3, {form:"lang", farbe:"#F5C542", muster:"gold"});
  /* Schuhe */
  stoffe(["weiss", "schwarz", "rot", "blau", "gruen", "gelb", "pink", "lila"], (k, n, f) => neu("schuhe", "sneaker-" + k, "Sneaker " + n, k === "weiss" ? 0 : 300, 0, {form:"sneaker", farbe:f}));
  stoffe(["braun", "schwarz", "beige"], (k, n, f) => neu("schuhe", "stiefel-" + k, "Stiefel " + n, 700, 0, {form:"stiefel", farbe:f}));
  stoffe(["rot", "schwarz", "tuerkis"], (k, n, f) => neu("schuhe", "hoch-" + k, "High-Tops " + n, 900, 0, {form:"hoch", farbe:f}));
  neu("schuhe", "latschen", "Badelatschen mit Socken", 500, 0, {form:"latschen", farbe:"#3F7FE0"});
  neu("schuhe", "led", "LED-Sneaker", 6000, 2, {form:"sneaker", farbe:"#33333D", leuchten:true});
  neu("schuhe", "gold", "Goldene Sneaker", 18000, 3, {form:"sneaker", farbe:"#F5C542", muster:"gold"});
  /* Kopf */
  neu("kopf", "nichts", "Nichts", 0, 0, {form:"nichts"});
  stoffe(["rot", "blau", "schwarz", "gruen", "weiss", "gelb"], (k, n, f) => neu("kopf", "kappe-" + k, "Kappe " + n, 400, 0, {form:"kappe", farbe:f}));
  stoffe(["grau", "rot", "marine", "gelb", "pink", "gruen"], (k, n, f) => neu("kopf", "muetze-" + k, "Mütze " + n, 350, 0, {form:"muetze", farbe:f}));
  stoffe(["rot", "weiss", "tuerkis"], (k, n, f) => neu("kopf", "stirnband-" + k, "Stirnband " + n, 300, 0, {form:"stirnband", farbe:f}));
  stoffe(["schwarz", "weiss", "rot"], (k, n, f) => neu("kopf", "hoerer-" + k, "Kopfhörer " + n, 1200, 0, {form:"hoerer", farbe:f}));
  neu("kopf", "party", "Partyhut", 800, 0, {form:"party"}); neu("kopf", "propeller", "Propellerkappe", 2500, 1, {form:"propeller"});
  neu("kopf", "zylinder", "Zylinder", 3500, 1, {form:"zylinder"}); neu("kopf", "doktor", "Doktorhut", 5000, 1, {form:"doktor"});
  neu("kopf", "schein", "Heiligenschein", 10000, 2, {form:"schein"}); neu("kopf", "krone", "Krone", 40000, 3, {form:"krone"});
  /* Extras */
  neu("extra", "nichts", "Nichts", 0, 0, {form:"nichts"});
  neu("extra", "kaffee", "Kaffeebecher", 400, 0, {form:"kaffee"}); neu("extra", "energy", "Energydrink", 400, 0, {form:"energy"}); neu("extra", "ballon", "Luftballon", 600, 0, {form:"ballon"});
  stoffe(["rot", "gelb", "tuerkis"], (k, n, f) => neu("extra", "schal-" + k, "Schal " + n, 500, 0, {form:"schal", farbe:f}));
  neu("extra", "usb", "USB-Stick an der Kette", 700, 0, {form:"usb"}); neu("extra", "medaille", "Medaille", 2000, 1, {form:"medaille"});
  neu("extra", "laptop", "Laptop", 2500, 1, {form:"laptop"}); neu("extra", "kette", "Goldkette", 3000, 1, {form:"kette"}); neu("extra", "board", "Skateboard", 3500, 1, {form:"board"});
  neu("extra", "roboter", "Roboter-Begleiter", 15000, 2, {form:"roboter"}); neu("extra", "pokal", "Goldpokal", 35000, 3, {form:"pokal"});
  /* Hintergründe */
  neu("hinter", "himmel", "Himmel", 0, 0, {form:"himmel"});
  stoffe(["gelb", "pink", "tuerkis", "lila", "orange", "grau"], (k, n, f) => neu("hinter", "farbe-" + k, "Farbe " + n, 200, 0, {form:"farbe", farbe:f}));
  neu("hinter", "platine", "Platine", 1500, 1, {form:"platine"}); neu("hinter", "abend", "Sonnenuntergang", 2500, 1, {form:"abend"}); neu("hinter", "strand", "Strand", 3000, 1, {form:"strand"});
  neu("hinter", "server", "Serverraum", 5000, 2, {form:"server"}); neu("hinter", "weltraum", "Weltraum", 6000, 2, {form:"weltraum"}); neu("hinter", "matrix", "Matrix", 8000, 2, {form:"matrix"});
  neu("hinter", "gold", "Goldglanz", 30000, 3, {form:"gold"});
})();
const TEIL = {}; KATALOG.forEach(t => { TEIL[t.id] = t; });
/* Womit jeder anfängt. */
const START_TRACHT = {haut:"haut-t2", haare:"haare-kurz", haarfarbe:"haarfarbe-braun", augen:"augen-normal", mund:"mund-laecheln", bart:"bart-keiner", brille:"brille-keine",
  oben:"oben-tshirt-weiss", unten:"unten-jeans", schuhe:"schuhe-sneaker-weiss", kopf:"kopf-nichts", extra:"extra-nichts", hinter:"hinter-himmel"};
/* Macht aus beliebigen Angaben eine vollständige, gültige Tracht (auch aus Einträgen der Rangliste). */
function trachtAus(angaben){
  const t = Object.assign({}, START_TRACHT);
  if (angaben) for (const [platz] of PLAETZE){ const teil = TEIL[angaben[platz]]; if (teil && teil.platz === platz) t[platz] = teil.id; }
  return t;
}
/* Kurzform für die Rangliste und zurück. */
const trachtAlsText = tracht => PLAETZE.map(([platz]) => tracht[platz].slice(platz.length + 1)).join(",");
function trachtAusText(text){ const teile = String(text || "").split(","), a = {}; PLAETZE.forEach(([platz], i) => { a[platz] = platz + "-" + teile[i]; }); return trachtAus(a); }

/* ---------- Zeichnen ---------- */
const FIGUR_AUSSCHNITT = {ganz:"0 -18 200 298", kopf:"36 -14 128 146", oben:"36 104 128 112", unten:"46 178 108 92", schuhe:"52 222 96 56"};
let figurZaehler = 0;
function figurSvg(trachtRoh, ausschnitt){
  const t = trachtAus(trachtRoh), T = platz => TEIL[t[platz]], U = "#3A2A1C", nr = ++figurZaehler, kennung = name => "f" + nr + name;
  const strich = 'stroke="' + U + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const p = (d, f, mehr) => '<path d="' + d + '" fill="' + f + '" ' + strich + " " + (mehr || "") + "/>";
  const kreis = (x, y, r, f, mitRand) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '"' + (mitRand === false ? "" : " " + strich) + "/>";
  const linie = (d, breite, farbe) => '<path d="' + d + '" fill="none" stroke="' + (farbe || U) + '" stroke-width="' + (breite || 3) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  const glied = (d, breite, f) => linie(d, breite + 6, U) + linie(d, breite, f);
  const text = (x, y, inhalt, groesse, farbe) => '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="ui-monospace,Menlo,Consolas,monospace" font-weight="700" font-size="' + groesse + '" fill="' + farbe + '">' + inhalt + "</text>";
  const hell = f => /^#(F|E|D|f|e|d)/.test(f) ? U : "#FFFFFF";                    // Schriftfarbe, die auf dem Stoff lesbar ist
  let defs = "";
  /* Besondere Stoffe als Füllung. */
  function fuellung(teil){
    if (!teil.muster) return teil.farbe;
    const id = kennung(teil.platz + teil.muster), punkt = (x, y, r, f) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '"/>';
    const kachel = (w, h, inhalt) => { defs += '<pattern id="' + id + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse">' + inhalt + "</pattern>"; };
    if (teil.muster === "gold") defs += '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1A8"/><stop offset=".45" stop-color="#F5C542"/><stop offset=".55" stop-color="#FFE98A"/><stop offset="1" stop-color="#C98A0A"/></linearGradient>';
    else if (teil.muster === "galaxie") kachel(40, 40, '<rect width="40" height="40" fill="#2B1B5A"/><circle cx="12" cy="14" r="12" fill="#5B2A9E" opacity=".7"/><circle cx="30" cy="30" r="10" fill="#1F5FD0" opacity=".6"/>' + punkt(6, 30, 1.2, "#fff") + punkt(22, 8, 1.6, "#fff") + punkt(34, 18, 1, "#fff") + punkt(16, 36, 1, "#FFE98A"));
    else if (teil.muster === "regenbogen") kachel(10, 42, ["#E5533D", "#F28C28", "#F7C948", "#4FB06D", "#3F7FE0", "#8B5CF6"].map((f, i) => '<rect y="' + i * 7 + '" width="10" height="7" fill="' + f + '"/>').join(""));
    else if (teil.muster === "platine") kachel(24, 24, '<rect width="24" height="24" fill="#2F8A63"/><path d="M0 6h10v10h14M12 0v6M18 16v8" stroke="#FFDD6B" stroke-width="1.6" fill="none"/>' + punkt(10, 6, 2, "#FFDD6B") + punkt(18, 16, 2, "#FFDD6B"));
    else if (teil.muster === "matrix") kachel(12, 18, '<rect width="12" height="18" fill="#10151A"/><text x="2" y="8" font-size="8" font-family="monospace" fill="#3DDC84">1</text><text x="6" y="16" font-size="8" font-family="monospace" fill="#1E9E5A">0</text>');
    else if (teil.muster === "glitch") kachel(60, 22, '<rect width="60" height="22" fill="#C9CED6"/><rect x="4" y="3" width="30" height="4" fill="#EC6FA9"/><rect x="22" y="9" width="34" height="4" fill="#2FB8A6"/><rect y="15" width="18" height="4" fill="#33333D"/>');
    else if (teil.muster === "karo") kachel(14, 14, '<rect width="14" height="14" fill="#C0392B"/><path d="M0 4h14M4 0v14" stroke="#33333D" stroke-width="3" opacity=".55"/><path d="M0 11h14M11 0v14" stroke="#F7C948" stroke-width="1"/>');
    return "url(#" + id + ")";
  }
  const haut = T("haut").farbe, haar = T("haarfarbe").farbe === "regenbogen" ? fuellung({platz:"haar", muster:"regenbogen"}) : T("haarfarbe").farbe;
  const oben = T("oben"), unten = T("unten"), schuh = T("schuhe"), obenF = fuellung(oben), untenF = fuellung(unten), schuhF = fuellung(schuh);
  const teile = [];

  /* Hintergrund */
  const hg = T("hinter"), flaeche = f => '<rect y="-18" width="200" height="298" fill="' + f + '"/>';
  if (ausschnitt === "ganz" || !ausschnitt){
    if (hg.form === "himmel") teile.push(flaeche("#BFE4FF"), '<ellipse cx="100" cy="270" rx="150" ry="34" fill="#86D45A"/>', '<ellipse cx="46" cy="50" rx="24" ry="9" fill="#fff" opacity=".9"/>', '<ellipse cx="160" cy="84" rx="20" ry="7" fill="#fff" opacity=".8"/>');
    else if (hg.form === "farbe") teile.push(flaeche(hg.farbe), '<ellipse cx="100" cy="266" rx="84" ry="12" fill="rgba(58,42,28,.18)"/>');
    else if (hg.form === "platine") teile.push(flaeche(fuellung({platz:"hg", muster:"platine"})));
    else if (hg.form === "abend"){ defs += '<linearGradient id="' + kennung("abend") + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2A7A"/><stop offset=".55" stop-color="#F28C28"/><stop offset="1" stop-color="#F7C948"/></linearGradient>';
      teile.push(flaeche("url(#" + kennung("abend") + ")"), '<circle cx="100" cy="196" r="46" fill="#FFE98A" opacity=".9"/>', '<rect y="232" width="200" height="48" fill="#3A2A1C" opacity=".55"/>'); }
    else if (hg.form === "strand") teile.push(flaeche("#9FD8F5"), '<rect y="150" width="200" height="60" fill="#3FA9D6"/>', '<rect y="204" width="200" height="76" fill="#F2DDA4"/>', '<circle cx="158" cy="44" r="20" fill="#FFE98A"/>');
    else if (hg.form === "server"){ let s = flaeche("#232A36"); for (let i = 0; i < 4; i++){ s += '<rect x="' + (8 + i * 48) + '" y="20" width="40" height="230" rx="4" fill="#3A4556"/>'; for (let j = 0; j < 9; j++) s += '<circle cx="' + (18 + i * 48) + '" cy="' + (36 + j * 24) + '" r="3" fill="' + ((i + j) % 3 ? "#3DDC84" : "#FFC933") + '"/><rect x="' + (26 + i * 48) + '" y="' + (33 + j * 24) + '" width="16" height="5" fill="#232A36"/>'; } teile.push(s); }
    else if (hg.form === "weltraum") teile.push(flaeche(fuellung({platz:"hg", muster:"galaxie"})), '<circle cx="160" cy="50" r="18" fill="#F7C948" opacity=".9"/>', '<ellipse cx="160" cy="50" rx="30" ry="6" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>');
    else if (hg.form === "matrix") teile.push(flaeche(fuellung({platz:"hg", muster:"matrix"})));
    else if (hg.form === "gold") teile.push(flaeche(fuellung({platz:"hg", muster:"gold"})), '<path d="M30 40l4 10 10 4-10 4-4 10-4-10-10-4 10-4zM166 150l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" opacity=".9"/>');
  }
  const extra = T("extra"), kopf = T("kopf");
  /* Dinge hinter der Figur */
  if (extra.form === "ballon") teile.push(linie("M154 196 Q166 150 170 96", 2), p("M170 96 Q146 84 150 56 Q156 34 172 34 Q190 36 192 58 Q192 84 170 96 Z", "#E5533D"), linie("M162 50 Q166 44 172 44", 2.5, "#fff"));
  if (extra.form === "board") teile.push(p("M150 150 Q174 150 176 164 L176 250 Q174 264 162 264 Q150 264 150 250 Z", "#F28C28"), kreis(163, 172, 6, "#33333D"), kreis(163, 244, 6, "#33333D"));
  if (oben.form === "hoodie") teile.push(p("M66 132 Q62 104 100 100 Q138 104 134 132 Q100 146 66 132 Z", obenF));
  const hf = T("haare").form;
  if (hf === "lang") teile.push(p("M54 74 Q48 24 100 24 Q152 24 146 74 L152 150 Q134 162 120 150 L80 150 Q66 162 48 150 Z", haar));
  if (hf === "bob") teile.push(p("M54 74 Q48 24 100 24 Q152 24 146 74 L150 112 Q134 122 122 112 L78 112 Q66 122 50 112 Z", haar));
  if (hf === "afro") teile.push(p("M40 70 Q30 10 100 8 Q170 10 160 70 Q166 104 138 108 L62 108 Q34 104 40 70 Z", haar));
  if (hf === "zopf") teile.push(p("M136 44 Q174 44 170 100 Q164 118 152 100 Q158 70 138 64 Z", haar));
  if (hf === "dutt") teile.push(kreis(100, 22, 15, haar));

  /* Beine, Schuhe, Hose */
  const nackt = unten.form === "kurz" || unten.form === "rock";
  teile.push(glied("M84 200 L84 248", 18, haut), glied("M116 200 L116 248", 18, haut));
  const hochSchuh = schuh.form === "stiefel" || schuh.form === "hoch";
  if (schuh.form === "latschen") teile.push(glied("M84 232 L84 248", 18, "#F4F1EA"), glied("M116 232 L116 248", 18, "#F4F1EA"), p("M66 262 q0-8 10-8 h20 q4 0 4 4 v4 z", schuhF), p("M134 262 q0-8 -10-8 h-20 q-4 0 -4 4 v4 z", schuhF));
  else {
    if (hochSchuh) teile.push(glied("M84 232 L84 248", 20, schuhF), glied("M116 232 L116 248", 20, schuhF));
    teile.push(p("M64 264 q0-16 16-16 h12 q8 0 8 8 v8 z", schuhF), p("M136 264 q0-16 -16-16 h-12 q-8 0 -8 8 v8 z", schuhF));
    teile.push(linie("M66 262 h32", 3, schuh.leuchten ? "#3DDCFF" : "#F4F1EA"), linie("M134 262 h-32", 3, schuh.leuchten ? "#FF5AD1" : "#F4F1EA"));
    if (schuh.form === "hoch") teile.push(linie("M76 240 h14", 2, "#F4F1EA"), linie("M110 240 h14", 2, "#F4F1EA"));
  }
  if (unten.form === "rock") teile.push(p("M66 192 L134 192 L148 234 Q100 244 52 234 Z", untenF));
  else {
    const ende = unten.form === "kurz" ? 222 : hochSchuh ? 236 : 246;
    teile.push(glied("M84 204 L84 " + ende, 22, untenF), glied("M116 204 L116 " + ende, 22, untenF), p("M66 190 L134 190 L132 214 Q116 220 100 210 Q84 220 68 214 Z", untenF));
    if (unten.form === "jogger") teile.push(linie("M74 " + ende + " h20", 5, "rgba(58,42,28,.45)"), linie("M106 " + ende + " h20", 5, "rgba(58,42,28,.45)"), linie("M96 196 v10 M104 196 v10", 2, "#F4F1EA"));
    if (unten.form === "cargo") teile.push(p("M72 220 h14 v12 h-14 z", untenF), p("M114 220 h14 v12 h-14 z", untenF));
  }

  /* Arme, Ärmel, Rumpf */
  teile.push(glied("M64 144 Q48 162 46 198", 15, haut), glied("M136 144 Q152 162 154 198", 15, haut));
  const lang = oben.form !== "tshirt";
  teile.push(glied(lang ? "M64 144 Q49 160 47 186" : "M64 144 Q55 152 53 164", 19, obenF), glied(lang ? "M136 144 Q151 160 153 186" : "M136 144 Q145 152 147 164", 19, obenF));
  const rumpf = "M62 152 Q62 128 86 128 L114 128 Q138 128 138 152 L136 202 Q100 212 64 202 Z";
  teile.push(p(rumpf, obenF));
  if (oben.streifen){ defs += '<clipPath id="' + kennung("rumpf") + '"><path d="' + rumpf + '"/></clipPath>'; teile.push('<g clip-path="url(#' + kennung("rumpf") + ')">' + [146, 164, 182].map(y => '<rect x="60" y="' + y + '" width="80" height="8" fill="' + oben.streifen + '"/>').join("") + "</g>", p(rumpf, "none")); }
  if (oben.form === "jacke") teile.push(p("M90 128 L110 128 L108 206 L92 206 Z", "#F4F1EA"), linie("M90 128 L84 150 L92 206", 3), linie("M110 128 L116 150 L108 206", 3), oben.id === "oben-jacke-college" ? linie("M64 198 Q100 208 136 198", 5, "#F4F1EA") : "");
  if (oben.form === "hemd") teile.push(linie("M100 136 V204", 2), kreis(100, 152, 2, U, false), kreis(100, 170, 2, U, false), kreis(100, 188, 2, U, false));
  if (oben.form === "hoodie") teile.push(p("M80 176 h40 l4 22 q-24 6 -48 0 z", obenF), linie("M92 134 v18", 2.5, "#F4F1EA"), linie("M108 134 v18", 2.5, "#F4F1EA"));
  /* Motive auf der Brust */
  const mf = hell(oben.farbe);
  ({
    blitz:() => teile.push(p("M104 146 L90 168 h10 l-4 18 l16-24 h-10 z", "#33333D", 'stroke-width="2"')),
    herz:() => teile.push(p("M100 182 Q78 166 86 152 Q94 144 100 156 Q106 144 114 152 Q122 166 100 182 Z", "#E5533D", 'stroke-width="2"')),
    stern:() => teile.push(p("M100 146 l5 12 13 1 -10 9 3 13 -11-7 -11 7 3-13 -10-9 13-1z", "#F7C948", 'stroke-width="2"')),
    binaer:() => teile.push(text(100, 160, "0110", 13, "#3DDC84"), text(100, 176, "1001", 13, "#3DDC84")),
    code:() => teile.push(text(100, 172, "&lt;/&gt;", 20, mf)),
    "404":() => teile.push(text(100, 172, "404", 20, mf)),
    smiley:() => teile.push(kreis(100, 166, 15, "#F7C948"), kreis(94, 162, 2, U, false), kreis(106, 162, 2, U, false), linie("M92 170 Q100 178 108 170", 2.5)),
    sudo:() => teile.push(text(100, 170, "sudo", 16, "#F7C948")),
    pi:() => teile.push(text(100, 176, "π", 30, mf)),
    wlan:() => teile.push(linie("M84 158 Q100 144 116 158", 3.5, mf), linie("M90 166 Q100 157 110 166", 3.5, mf), kreis(100, 176, 3.5, mf, false)),
    kaffee:() => teile.push(p("M88 158 h22 v14 q0 8 -11 8 q-11 0 -11 -8 z", "#F4F1EA", 'stroke-width="2"'), linie("M110 162 q8 0 8 6 q0 6 -8 6", 2), linie("M94 152 q2-4 0-8 M103 152 q2-4 0-8", 2)),
    bug:() => teile.push(p("M90 166 q0-12 10-12 q10 0 10 12 v6 q0 10 -10 10 q-10 0 -10 -10 z", "#33333D", 'stroke-width="2"'), linie("M90 164 l-8-4 M90 172 h-9 M110 164 l8-4 M110 172 h9 M94 154 l-4-6 M106 154 l4-6", 2)),
    bluescreen:() => teile.push(text(100, 168, ":(", 24, "#fff")),
    prompt:() => teile.push(text(100, 170, "&gt;_", 22, "#3DDC84"))
  }[oben.motiv] || (() => {}))();

  /* Hände, Hals, Kragen */
  teile.push(kreis(46, 200, 8, haut), kreis(154, 200, 8, haut));
  teile.push(p("M90 110 h20 v18 q-10 8 -20 0 z", haut));
  if (oben.form === "hemd") teile.push(p("M88 126 L100 138 L84 142 Z", obenF), p("M112 126 L100 138 L116 142 Z", obenF));
  else if (oben.form !== "jacke") teile.push(linie("M88 129 Q100 139 112 129", 3));

  /* Kopf und Gesicht */
  teile.push(kreis(58, 78, 8, haut), kreis(142, 78, 8, haut), '<ellipse cx="100" cy="72" rx="42" ry="44" fill="' + haut + '" ' + strich + "/>");
  teile.push('<circle cx="72" cy="92" r="7" fill="#F28C8C" opacity=".35"/><circle cx="128" cy="92" r="7" fill="#F28C8C" opacity=".35"/>');
  const bart = T("bart").form;
  if (bart === "vollbart") teile.push(p("M60 82 Q60 122 100 122 Q140 122 140 82 Q130 98 114 98 Q100 90 86 98 Q70 98 60 82 Z", haar));
  if (bart === "kinnbart") teile.push(p("M88 106 Q100 124 112 106 Q100 112 88 106 Z", haar));
  if (bart === "stoppeln") teile.push([[74, 100], [82, 106], [90, 110], [100, 112], [110, 110], [118, 106], [126, 100], [80, 98], [120, 98], [96, 106], [104, 106]].map(q => kreis(q[0], q[1], 1.3, U, false)).join(""));
  const auge = T("augen").form, ax = [84, 116];
  ({
    normal:() => ax.forEach(x => teile.push(kreis(x, 76, 5, U, false), kreis(x + 1.5, 74.5, 1.6, "#fff", false))),
    gross:() => ax.forEach(x => teile.push('<ellipse cx="' + x + '" cy="76" rx="8" ry="9" fill="#fff" ' + strich + ' stroke-width="2"/>', kreis(x, 77, 4.5, U, false), kreis(x + 1.5, 75.5, 1.5, "#fff", false))),
    lachend:() => ax.forEach(x => teile.push(linie("M" + (x - 7) + " 78 Q" + x + " 69 " + (x + 7) + " 78", 3.5))),
    muede:() => ax.forEach(x => teile.push(kreis(x, 78, 4.5, U, false), linie("M" + (x - 7) + " 74 h14", 3))),
    zwinkern:() => teile.push(kreis(84, 76, 5, U, false), kreis(85.5, 74.5, 1.6, "#fff", false), linie("M109 77 Q116 70 123 77", 3.5)),
    sterne:() => ax.forEach(x => teile.push(p("M" + x + " 66 l3 7 7 1 -5 5 1 7 -6-4 -6 4 1-7 -5-5 7-1z", "#F7C948", 'stroke-width="1.6"')))
  }[auge])();
  if (auge !== "sterne") teile.push(linie("M76 64 Q84 60 92 64", 3, U), linie("M108 64 Q116 60 124 64", 3, U));
  ({
    laecheln:() => teile.push(linie("M88 96 Q100 107 112 96", 3.5)),
    grinsen:() => teile.push(p("M86 94 Q100 114 114 94 Z", "#fff", 'stroke-width="2.5"')),
    neutral:() => teile.push(linie("M90 100 h20", 3.5)),
    staunen:() => teile.push('<ellipse cx="100" cy="100" rx="6" ry="7" fill="#7A2A22" ' + strich + ' stroke-width="2.5"/>'),
    schmollen:() => teile.push(linie("M88 103 Q100 94 112 103", 3.5)),
    zunge:() => teile.push(p("M86 94 Q100 114 114 94 Z", "#7A2A22", 'stroke-width="2.5"'), p("M94 102 q6 12 12 0 z", "#F28C8C", 'stroke-width="2"'))
  }[T("mund").form])();
  if (bart === "schnurrbart") teile.push(p("M84 92 Q92 84 100 90 Q108 84 116 92 Q108 96 100 93 Q92 96 84 92 Z", haar, 'stroke-width="2"'));

  /* Frisur vorn */
  ({
    kurz:() => teile.push(p("M58 72 Q54 28 100 26 Q146 28 142 72 Q136 52 120 48 Q100 43 80 48 Q64 52 58 72 Z", haar)),
    scheitel:() => teile.push(p("M58 76 Q52 26 104 26 Q148 28 142 74 Q134 50 110 46 Q84 58 58 76 Z", haar)),
    lang:() => teile.push(p("M58 78 Q54 28 100 26 Q146 28 142 78 Q134 52 112 48 Q86 58 58 78 Z", haar)),
    bob:() => teile.push(p("M58 78 Q54 28 100 26 Q146 28 142 78 L142 60 Q100 44 58 60 Z", haar)),
    locken:() => teile.push([[62, 58], [72, 40], [88, 30], [106, 28], [124, 34], [136, 48], [142, 64]].map(q => kreis(q[0], q[1], 13, haar)).join(""), [[80, 46], [98, 40], [118, 44]].map(q => kreis(q[0], q[1], 12, haar)).join("")),
    zopf:() => teile.push(p("M58 76 Q52 26 104 26 Q148 28 142 74 Q134 50 110 46 Q84 58 58 76 Z", haar)),
    dutt:() => teile.push(p("M58 72 Q54 28 100 26 Q146 28 142 72 Q136 52 120 48 Q100 43 80 48 Q64 52 58 72 Z", haar)),
    igel:() => teile.push(p("M58 70 L60 44 L70 54 L74 30 L86 46 L94 20 L104 44 L116 22 L120 46 L134 32 L134 54 L144 46 L142 70 Q120 50 100 50 Q80 50 58 70 Z", haar)),
    afro:() => teile.push(p("M58 74 Q56 44 100 42 Q144 44 142 74 Q130 56 100 56 Q70 56 58 74 Z", haar)),
    undercut:() => teile.push(p("M64 58 Q66 24 104 24 Q142 26 138 56 Q112 40 64 58 Z", haar)),
    iro:() => teile.push(p("M90 46 Q84 4 100 2 Q116 4 110 46 Z", haar), linie("M92 30 L86 20 M100 22 V8 M108 30 L114 20", 2.5)),
    glatze:() => {}
  }[hf])();

  /* Brille */
  ({
    rund:() => teile.push('<circle cx="84" cy="77" r="12" fill="rgba(255,255,255,.25)" ' + strich + '/><circle cx="116" cy="77" r="12" fill="rgba(255,255,255,.25)" ' + strich + "/>", linie("M96 77 h8")),
    eckig:() => teile.push('<rect x="71" y="67" width="26" height="19" rx="4" fill="rgba(255,255,255,.25)" ' + strich + '/><rect x="103" y="67" width="26" height="19" rx="4" fill="rgba(255,255,255,.25)" ' + strich + "/>", linie("M97 76 h6")),
    nerd:() => teile.push('<rect x="70" y="66" width="27" height="21" rx="5" fill="rgba(255,255,255,.3)" stroke="' + U + '" stroke-width="5"/><rect x="103" y="66" width="27" height="21" rx="5" fill="rgba(255,255,255,.3)" stroke="' + U + '" stroke-width="5"/>', linie("M97 74 h6", 5)),
    sonne:() => teile.push(p("M68 68 h30 v10 q0 10 -15 10 q-15 0 -15 -10 z", "#33333D"), p("M102 68 h30 v10 q0 10 -15 10 q-15 0 -15 -10 z", "#33333D"), linie("M98 71 h4"), linie("M74 72 l8 0", 2, "#9AA3AE")),
    herz:() => [84, 116].forEach(x => teile.push(p("M" + x + " 90 Q" + (x - 18) + " 78 " + (x - 10) + " 68 Q" + (x - 3) + " 62 " + x + " 72 Q" + (x + 3) + " 62 " + (x + 10) + " 68 Q" + (x + 18) + " 78 " + x + " 90 Z", "#EC6FA9"))),
    vr:() => teile.push(p("M62 62 h76 q6 0 6 6 v18 q0 6 -6 6 h-76 q-6 0 -6 -6 v-18 q0 -6 6 -6 z", "#33333D"), '<rect x="70" y="70" width="60" height="6" rx="3" fill="#3DDCFF"/>'),
    pixel:() => teile.push('<path d="M62 66 h76 v6 h-6 v6 h-6 v6 h-18 v-6 h-6 v-6 h-4 v6 h-6 v6 h-18 v-6 h-6 v-6 h-6 z" fill="#15181D"/><path d="M74 72 h6 v6 h-6z M110 72 h6 v6 h-6z" fill="#fff"/>'),
    keine:() => {}
  }[T("brille").form])();

  /* Kopfbedeckung */
  const kf = kopf.farbe;
  ({
    kappe:() => teile.push(p("M58 58 Q56 22 100 20 Q144 22 142 58 Z", kf), p("M58 56 Q104 44 152 60 Q160 66 150 70 Q104 58 58 64 Z", kf), kreis(100, 21, 4, kf)),
    muetze:() => teile.push(p("M58 60 Q54 18 100 16 Q146 18 142 60 Z", kf), p("M54 52 h92 v14 h-92 z", kf), kreis(100, 12, 9, "#F4F1EA")),
    stirnband:() => teile.push(p("M58 50 Q100 40 142 50 L142 62 Q100 52 58 62 Z", kf)),
    hoerer:() => teile.push(linie("M56 78 Q54 20 100 18 Q146 20 144 78", 9, U), linie("M56 78 Q54 20 100 18 Q146 20 144 78", 4, kf), p("M46 64 h14 v30 h-14 q-4 0 -4 -4 v-22 q0 -4 4 -4 z", kf), p("M154 64 h-14 v30 h14 q4 0 4 -4 v-22 q0 -4 -4 -4 z", kf)),
    party:() => teile.push(p("M76 40 L104 -8 L126 40 Z", "#EC6FA9"), kreis(104, -8, 6, "#F7C948"), kreis(96, 28, 3, "#F7C948", false), kreis(108, 18, 3, "#2FB8A6", false), kreis(112, 32, 3, "#fff", false)),
    propeller:() => teile.push(p("M58 58 Q56 22 100 20 Q144 22 142 58 Z", "#E5533D"), p("M100 20 Q78 24 72 58 L58 58 Q56 24 100 20 Z", "#3F7FE0"), p("M100 20 Q122 24 128 58 L142 58 Q144 24 100 20 Z", "#F7C948"), linie("M100 20 v-10"), p("M100 10 q-22-10 -26 0 q4 8 26 0 z", "#4FB06D"), p("M100 10 q22-10 26 0 q-4 8 -26 0 z", "#4FB06D")),
    zylinder:() => teile.push(p("M70 44 V2 h60 v42 z", "#33333D"), p("M50 44 h100 v9 h-100 z", "#33333D"), '<rect x="71" y="30" width="58" height="9" fill="#C0392B"/>'),
    doktor:() => teile.push(p("M62 52 Q62 34 100 34 Q138 34 138 52 Z", "#33333D"), p("M44 28 L100 12 L156 28 L100 44 Z", "#33333D"), linie("M150 30 v26", 2.5, "#F7C948"), kreis(150, 58, 4, "#F7C948")),
    schein:() => teile.push('<ellipse cx="100" cy="12" rx="34" ry="8" fill="none" stroke="' + U + '" stroke-width="9"/><ellipse cx="100" cy="12" rx="34" ry="8" fill="none" stroke="#FFE98A" stroke-width="5"/>'),
    krone:() => { defs += '<linearGradient id="' + kennung("krone") + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1A8"/><stop offset=".5" stop-color="#F5C542"/><stop offset="1" stop-color="#C98A0A"/></linearGradient>';
      teile.push(p("M62 46 L58 8 L80 28 L100 2 L120 28 L142 8 L138 46 Z", "url(#" + kennung("krone") + ")"), kreis(100, 34, 5, "#E5533D"), kreis(78, 38, 4, "#3F7FE0"), kreis(122, 38, 4, "#4FB06D")); },
    nichts:() => {}
  }[kopf.form])();

  /* Extras vor der Figur */
  ({
    kaffee:() => teile.push(p("M146 186 h18 l-2 24 h-14 z", "#F4F1EA"), '<rect x="147" y="194" width="16" height="8" fill="#8A5A30"/>', p("M144 184 h22 v4 h-22 z", "#8A5A30")),
    energy:() => teile.push(p("M148 182 h14 v28 h-14 z", "#2FB8A6"), p("M156 188 l-5 8 h4 l-2 8 l6-10 h-4 z", "#F7C948", 'stroke-width="1.5"')),
    schal:() => teile.push(p("M78 120 Q100 136 122 120 L124 134 Q100 148 76 134 Z", extra.farbe), p("M108 134 h14 v34 h-14 z", extra.farbe), linie("M108 160 h14", 2)),
    usb:() => teile.push(linie("M84 130 Q100 168 116 130", 2, "#9AA3AE"), p("M94 160 h12 v16 h-12 z", "#3F7FE0"), '<rect x="96" y="176" width="8" height="6" fill="#B8BCC4" ' + strich + ' stroke-width="1.5"/>'),
    medaille:() => teile.push(linie("M86 130 L100 164 L114 130", 4, "#E5533D"), kreis(100, 170, 10, "#F7C948"), text(100, 174, "1", 12, U)),
    laptop:() => teile.push(p("M30 176 h44 v28 h-44 z", "#B8BCC4"), '<rect x="34" y="180" width="36" height="20" fill="#3F7FE0"/>', p("M24 204 h56 v6 h-56 z", "#9AA3AE")),
    kette:() => teile.push(linie("M84 130 Q100 172 116 130", 5, U), linie("M84 130 Q100 172 116 130", 3, "#F5C542"), kreis(100, 162, 7, "#F5C542"), text(100, 166, "$", 10, U)),
    roboter:() => teile.push(linie("M172 86 v-10", 2.5), kreis(172, 74, 3.5, "#E5533D"), p("M156 86 h32 q6 0 6 6 v20 q0 6 -6 6 h-32 q-6 0 -6 -6 v-20 q0 -6 6 -6 z", "#B8BCC4"), '<rect x="158" y="94" width="28" height="12" rx="4" fill="#15181D"/>', kreis(166, 100, 3, "#3DDCFF", false), kreis(178, 100, 3, "#3DDCFF", false), linie("M164 124 q8 6 16 0", 2.5, "#3DDCFF")),
    pokal:() => { defs += '<linearGradient id="' + kennung("pokal") + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1A8"/><stop offset=".5" stop-color="#F5C542"/><stop offset="1" stop-color="#C98A0A"/></linearGradient>';
      teile.push(p("M140 160 h28 v14 q0 14 -14 14 q-14 0 -14 -14 z", "url(#" + kennung("pokal") + ")"), linie("M140 164 q-8 0 -8 8 q0 8 10 8 M168 164 q8 0 8 8 q0 8 -10 8", 3), p("M150 188 h8 v8 h8 v6 h-24 v-6 h8 z", "url(#" + kennung("pokal") + ")")); },
    ballon:() => {}, board:() => {}, nichts:() => {}
  }[extra.form])();

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (FIGUR_AUSSCHNITT[ausschnitt] || FIGUR_AUSSCHNITT.ganz) + '" role="img" aria-hidden="true">' + (defs ? "<defs>" + defs + "</defs>" : "") + teile.join("") + "</svg>";
}
/* Die Figur als fertiges Element. */
function figurBild(tracht, ausschnitt, klasse){ const s = document.createElement("span"); s.className = "figur " + (klasse || ""); s.innerHTML = figurSvg(tracht, ausschnitt); return s; }
