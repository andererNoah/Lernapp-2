"use strict";
/* =====================================================================
   HOCHLADEN: eigene Themen für den ganzen Kurs.

   So läuft es ab:
     1. Vorlage kopieren und mit eigenem Lernmaterial einer KI geben
        (ChatGPT, Claude, Gemini). Die Antwort ist ein Thema im Format unten.
     2. Antwort einfügen oder als Datei wählen. Die App prüft jede Aufgabe
        mit denselben Regeln wie den eingebauten Lernstoff (lernstoff.js).
     3. Hochladen: Das Thema ist sofort für alle im Kurs spielbar.
        Löschen kann es, wer es hochgeladen hat, und der Admin aus konfig.js.

   Wo es liegt: in der Firebase-Datenbank unter themen/<Kurs-Ort>/<id>,
   am selben geheimen Ort wie die Rangliste (rangliste.js, kursOrtBestimmen).
   Der Inhalt ist mit dem Kurs-Schlüssel verschlüsselt (AES-GCM, zugang.js):
   In der Datenbank steht nichts Lesbares, auch nicht für den Betreiber.

   Kennungen: Thema „u-<id>“, Kapitel „u-<id>-1“, „u-<id>-2“ …
   Sie können nie mit dem eingebauten Lernstoff zusammenstoßen.
   Hochgeladene Themen sind nicht in Duellen, weil beide Spieler sonst
   nicht sicher dieselben Fragen hätten (duell.js).

   Firebase-Regeln (Konsole → Realtime Database → Regeln), innerhalb von "rules"
   neben "rangliste" einfügen. <KURS-ORT> ist derselbe geheime Ort wie bei der
   Rangliste; <ADMIN> ist die Kennung aus konfig.js (leer lassen geht auch):
     "themen": {
       "<KURS-ORT>": {
         ".read": true,
         "$id": {
           ".write": "auth != null && (data.exists() ? (data.child('von').val() === auth.uid || auth.uid === '<ADMIN>') : newData.child('von').val() === auth.uid)",
           ".validate": "$id.matches(/^[a-z0-9]{4,20}$/) && newData.hasChildren(['von', 'name', 'zeit', 'iv', 'daten']) && newData.child('von').val() === auth.uid && newData.child('name').isString() && newData.child('name').val().length <= 16 && newData.child('zeit').val() === now && newData.child('iv').isString() && newData.child('iv').val().length <= 32 && newData.child('daten').isString() && newData.child('daten').val().length <= 800000",
           "$feld": { ".validate": "$feld === 'von' || $feld === 'name' || $feld === 'zeit' || $feld === 'iv' || $feld === 'daten'" }
         }
       }
     }
   ===================================================================== */

const HOCHGELADEN = [];                      // {id, von, name, zeit, titel, modul} je geladenem Thema, neueste zuerst
let hochladenFehler = false;                 // true, wenn die Liste beim Start nicht geladen werden konnte
const HOCHLADEN_GRENZEN = {kapitel:30, aufgaben:600, zeichenJeAufgabe:4000, titel:60, name:16, daten:800000};

/* Geht nur mit Rangliste (Firebase in konfig.js) und verschlüsseltem Lernstoff. */
const hochladenAn = () => ranglisteAn() && !!zugangSchluessel;
const themenPfad = id => RL.datenbank.replace(/\/+$/, "") + "/themen/" + encodeURIComponent(kursOrt) + (id ? "/" + id : "") + ".json";
const istAdminKonto = () => !!(RL.admin && G.konto && G.konto.uid === RL.admin);
const darfLoeschen = info => !!(info && G.konto && (info.von === G.konto.uid || istAdminKonto()));

/* Die Vorlage für die KI. Sie beschreibt genau das Format, das themaPruefen() annimmt. */
const VORLAGE = `Erstelle aus dem Lernmaterial unten Lernaufgaben für das Lernspiel Chipdorf.
Antworte NUR mit gültigem JSON, ohne Text davor oder danach, in genau dieser Form:

{"titel": "Name des Themas", "kapitel": [
  {"titel": "Kapitelname", "stichworte": "drei bis fünf Stichworte", "aufgaben": [ … ]}
]}

Regeln:
- 4 bis 8 Kapitel entlang des Materials, je Kapitel 10 bis 15 Aufgaben, Typen gemischt.
- Nur Inhalte aus dem Material, fachlich korrekt, auf Deutsch.
- Jede Aufgabe bekommt eine kurze "erklaerung" (ein bis zwei Sätze), außer "erklaeren".
- Keine Aufgaben, bei denen man lange rechnen muss. Tabellen immer als "schema".

Aufgabentypen, genau mit diesen Feldern:
- Auswahl: {"typ":"wahl","frage":"…","antworten":["richtig","falsch","falsch","falsch"],"erklaerung":"…"}
  Genau 4 Antworten, die richtige steht immer zuerst.
- Wahr oder falsch: {"typ":"wahrfalsch","frage":"Eine Aussage …","stimmt":true,"erklaerung":"…"}
- Lückentext: {"typ":"luecke","text":"Ein Satz mit {Lücke} und {zweiter Lücke}.","falsch":["Ablenker","Ablenker"],"erklaerung":"…"}
- Einsortieren: {"typ":"gruppen","frage":"…","gruppen":{"Gruppe A":["…","…"],"Gruppe B":["…","…"]},"erklaerung":"…"}
- Reihenfolge: {"typ":"reihenfolge","frage":"…","schritte":["erster","zweiter","dritter"],"erklaerung":"…"}
  Die Schritte in der richtigen Reihenfolge angeben.
- Zuordnen: {"typ":"paare","frage":"…","paare":[["Begriff","Bedeutung"],["…","…"],["…","…"]],"erklaerung":"…"}
  3 bis 5 Paare, alle rechten Seiten verschieden.
- Eingabe: {"typ":"eingabe","frage":"…","text":["Lösung","andere Schreibweise"],"erklaerung":"…"}
  Nur für kurze, eindeutige Begriffe. Für Zahlen stattdessen "zahl": 12.5 und wenn nötig "einheit": "€".
- Tabelle: {"typ":"schema","frage":"…","zeilen":[["","Spalte 1","Spalte 2"],["Zeile 1","?Lösung","fester Text"]],"falsch":["Ablenker"],"erklaerung":"…"}
  Zellen, die mit ? beginnen, sind Lücken. Höchstens 5 Spalten, kurze Zellen.
- Erklären: {"typ":"erklaeren","frage":"…","punkte":["Kernpunkt 1","Kernpunkt 2"],"worte":["stichwort|synonym","stichwort"]}
  worte[i] sind Stichworte für punkte[i], Alternativen mit | getrennt.

Hier ist mein Lernmaterial:
`;

/* ---------- Prüfen ---------- */

/* Holt das JSON aus der Antwort der KI, auch wenn Text oder ```json drumherum steht. */
function themaAusText(text){
  const s = String(text || ""), a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("Im Text steht kein Thema. Kopiere die ganze Antwort der KI.");
  try { return JSON.parse(s.slice(a, b + 1)); }
  catch (e) { throw new Error("Die Antwort ist kein gültiges JSON. Bitte die KI, nur das JSON auszugeben, und kopiere es vollständig."); }
}
/* Prüft ein Thema mit den Regeln aus lernstoff.js. Gibt {kapitel, aufgaben, hinweise} zurück; was nicht passt, fällt weg. */
function themaPruefen(roh){
  const hinweise = [], kapitel = [], G_ = HOCHLADEN_GRENZEN;
  const liste = roh && Array.isArray(roh.kapitel) ? roh.kapitel : null;
  if (!liste) throw new Error("Im Thema fehlt die Liste „kapitel“.");
  liste.slice(0, G_.kapitel).forEach((k, i) => {
    const wo = "Kapitel " + (i + 1);
    const titel = k && typeof k.titel === "string" ? k.titel.trim().slice(0, 80) : "";
    if (!titel || !Array.isArray(k.aufgaben)){ hinweise.push(wo + ": Titel oder Aufgaben fehlen. Kapitel übersprungen."); return; }
    const aufgaben = [], kennungen = new Set();
    k.aufgaben.forEach((a, j) => {
      const woA = wo + " („" + titel + "“), Aufgabe " + (j + 1);
      if (!a || typeof a !== "object" || a.typ === "rechnen" || !AUFGABE_VOLLSTAENDIG[a.typ]){ hinweise.push(woA + ": unbekannter Typ „" + (a && a.typ) + "“."); return; }
      let gut = false; try { gut = AUFGABE_VOLLSTAENDIG[a.typ](a); } catch (e) {}
      if (!gut){ hinweise.push(woA + ": Für den Typ „" + a.typ + "“ fehlt ein Feld oder es hat die falsche Form."); return; }
      if (JSON.stringify(a).length > G_.zeichenJeAufgabe){ hinweise.push(woA + ": zu lang."); return; }
      const kennung = kurzschluessel(a.typ + "|" + frageText(a));
      if (kennungen.has(kennung)){ hinweise.push(woA + ": doppelt (gleicher Typ und gleiche Frage)."); return; }
      kennungen.add(kennung);
      const sauber = Object.assign({}, a); delete sauber.id; delete sauber.kennung;
      aufgaben.push(sauber);
    });
    if (!aufgaben.length){ hinweise.push(wo + " („" + titel + "“): keine gültige Aufgabe. Kapitel übersprungen."); return; }
    kapitel.push({titel, stichworte:typeof k.stichworte === "string" ? k.stichworte.slice(0, 160) : "", aufgaben});
  });
  if (liste.length > G_.kapitel) hinweise.push("Mehr als " + G_.kapitel + " Kapitel: Der Rest wurde weggelassen.");
  let anzahl = kapitel.reduce((n, k) => n + k.aufgaben.length, 0);
  if (anzahl > G_.aufgaben) throw new Error("Zu viele Aufgaben (" + anzahl + "). Höchstens " + G_.aufgaben + " pro Thema.");
  return {kapitel, aufgaben:anzahl, hinweise};
}
/* Modul-Kennung aus einem frei gewählten Namen: gleiche Namen landen im selben Modul. */
function modulKennung(name){
  const s = String(name).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return s ? "x-" + s : "";
}

/* ---------- Speichern und Laden ---------- */

async function themaVerschluesseln(inhalt){
  const k = await crypto.subtle.importKey("raw", zugangSchluessel, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const daten = new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM", iv}, k, new TextEncoder().encode(JSON.stringify(inhalt))));
  return {iv:zuBase64(iv), daten:zuBase64(daten)};
}
const neueThemaId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => (b % 36).toString(36)).join("");

/* Lädt ein Thema für alle hoch. Gibt die Kennung des neuen Themas zurück. */
async function themaHochladen(titel, modul, name, geprueft){
  const paket = await themaVerschluesseln({titel, modul, kapitel:geprueft.kapitel});
  if (paket.daten.length > HOCHLADEN_GRENZEN.daten) throw new Error("Das Thema ist zu groß. Teile es in zwei Themen auf.");
  const ausweis = await kontoAusweis(), id = neueThemaId();
  await anfrage(themenPfad(id) + "?auth=" + encodeURIComponent(ausweis), {method:"PUT", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({von:G.konto.uid, name, zeit:{".sv":"timestamp"}, iv:paket.iv, daten:paket.daten})});
  return "u-" + id;
}
async function themaLoeschen(info){
  const ausweis = await kontoAusweis();
  await anfrage(themenPfad(info.id) + "?auth=" + encodeURIComponent(ausweis), {method:"DELETE"});
}
/* Beim Start, vor bereiteLernstoffAuf(): alle hochgeladenen Themen holen, entschlüsseln und wie Lernstoff anmelden.
   Fehler (offline, Regeln noch nicht eingerichtet) stören das Spiel nicht; dann fehlen nur die hochgeladenen Themen. */
async function hochgeladeneLaden(){
  if (!hochladenAn()) return;
  let roh;
  try { roh = await Promise.race([anfrage(themenPfad()), new Promise((_, nein) => setTimeout(() => nein(new Error("Zeit")), 4000))]) || {}; }
  catch (e) { hochladenFehler = true; return; }
  const eintraege = Object.entries(roh).filter(([id, e]) => /^[a-z0-9]{4,20}$/.test(id) && e && typeof e.iv === "string" && typeof e.daten === "string")
    .sort((a, b) => (+b[1].zeit || 0) - (+a[1].zeit || 0));
  for (const [id, e] of eintraege){
    let inhalt; try { inhalt = await entschluessle({iv:e.iv, daten:e.daten}, zugangSchluessel); } catch (f) { continue; }     // nicht mit dem Kurs-Schlüssel verschlüsselt: überspringen
    if (!inhalt || !Array.isArray(inhalt.kapitel)) continue;
    const info = {id, von:String(e.von || ""), name:String(e.name || "?").slice(0, HOCHLADEN_GRENZEN.name), zeit:+e.zeit || 0, titel:String(inhalt.titel || "Eigenes Thema").slice(0, HOCHLADEN_GRENZEN.titel)};
    const modul = inhalt.modul && /^[a-z0-9-]+$/.test(inhalt.modul.id || "") ? {id:inhalt.modul.id, titel:String(inhalt.modul.titel || inhalt.modul.id).slice(0, 40)} : {id:"eigene", titel:"Eigene Themen"};
    info.modul = modul;
    HOCHGELADEN.push(info);
    LERNSTOFF.push({id:"u-" + id, titel:info.titel, modul, hochgeladen:info,
      kapitel:inhalt.kapitel.map((k, i) => ({id:"u-" + id + "-" + (i + 1), titel:String(k.titel || "Kapitel " + (i + 1)), stichworte:String(k.stichworte || ""), aufgaben:Array.isArray(k.aufgaben) ? k.aufgaben : []}))});
  }
}

/* ---------- Ansicht ---------- */

/* Kleiner Hinweis auf der Weltkarte: wer das Thema hochgeladen hat, und Löschen für Berechtigte. */
function hochgeladenZeile(thema){
  const info = thema && thema.hochgeladen; if (!info) return null;
  const datum = info.zeit ? new Date(info.zeit).toLocaleDateString("de-DE") : "";
  const loeschen = darfLoeschen(info) ? h("button", {class:"textknopf", type:"button", onclick:async e => {
    const knopf = e.currentTarget;                                    // nach dem Warten ist currentTarget nicht mehr gesetzt
    if (!confirm("„" + info.titel + "“ für alle löschen? Das lässt sich nicht rückgängig machen.")) return;
    knopf.disabled = true;
    try { await themaLoeschen(info); location.reload(); }
    catch (f) { knopf.disabled = false; alert("Löschen hat nicht geklappt. Bist du online?"); }
  }}, "Thema löschen") : null;
  return h("p", {class:"einstieg klein"}, "Hochgeladen von " + info.name + (datum ? " am " + datum : "") + ". ", loeschen);
}

function hochladenAnsicht(){
  beginne("hochladen"); tagPruefen();
  let geprueft = null;
  const feldTitel = h("input", {class:"namensfeld", type:"text", maxlength:String(HOCHLADEN_GRENZEN.titel), placeholder:"z. B. Statistik Kapitel 1–4", "aria-label":"Name des Themas"});
  const feldName = h("input", {class:"namensfeld", type:"text", maxlength:String(HOCHLADEN_GRENZEN.name), value:G.name || "", placeholder:"Dein Name", "aria-label":"Dein Name"});
  const module = MODULE_ALLE.filter(m => m.titel && m.titel !== "folgt" && m.id !== "eigene");
  const wahlModul = h("select", {class:"namensfeld", "aria-label":"Modul"},
    module.map(m => h("option", {value:m.id}, m.titel)), h("option", {value:"neu"}, "Neues Modul …"));
  const feldModul = h("input", {class:"namensfeld", type:"text", maxlength:"40", placeholder:"Name des neuen Moduls", "aria-label":"Name des neuen Moduls", hidden:true});
  wahlModul.addEventListener("change", () => { feldModul.hidden = wahlModul.value !== "neu"; if (!feldModul.hidden) feldModul.focus(); });
  const text = h("textarea", {class:"freitext", rows:"7", placeholder:"Antwort der KI hier einfügen", "aria-label":"Antwort der KI"});
  const datei = h("input", {type:"file", accept:".json,.txt,application/json,text/plain", "aria-label":"Datei wählen"});
  const bericht = h("div", {role:"status"}), knopfHoch = h("button", {class:"knopf haupt gross", type:"button", hidden:true, onclick:hochladen}, "Für alle hochladen");
  const vorlageMeldung = h("span", {class:"leise klein", role:"status"});
  text.addEventListener("input", () => { geprueft = null; knopfHoch.hidden = true; bericht.replaceChildren(); });
  datei.addEventListener("change", async () => { const f = datei.files && datei.files[0]; if (!f) return;
    if (f.size > 2000000){ bericht.replaceChildren(h("p", {class:"pruefbericht schlecht"}, "Die Datei ist zu groß.")); return; }
    text.value = await f.text(); pruefen(); });

  function pruefen(){
    knopfHoch.hidden = true; geprueft = null;
    let roh; try { roh = themaAusText(text.value); geprueft = themaPruefen(roh); }
    catch (e) { bericht.replaceChildren(h("p", {class:"pruefbericht schlecht"}, e.message)); return; }
    if (!feldTitel.value.trim() && typeof roh.titel === "string") feldTitel.value = roh.titel.trim().slice(0, HOCHLADEN_GRENZEN.titel);
    if (!geprueft.kapitel.length){ bericht.replaceChildren(h("p", {class:"pruefbericht schlecht"}, "Keine gültige Aufgabe gefunden."), hinweisListe(geprueft.hinweise)); geprueft = null; return; }
    bericht.replaceChildren(h("p", {class:"pruefbericht gut"}, geprueft.kapitel.length + (geprueft.kapitel.length === 1 ? " Kapitel" : " Kapitel") + " mit " + geprueft.aufgaben + " Aufgaben sind in Ordnung."),
      h("ul", {class:"hinweisliste"}, geprueft.kapitel.map(k => h("li", null, k.titel + ": " + k.aufgaben.length + " Aufgaben"))),
      ...(geprueft.hinweise.length ? [h("p", {class:"leise"}, geprueft.hinweise.length + " Hinweise, diese Teile fallen weg:"), hinweisListe(geprueft.hinweise)] : []));
    knopfHoch.hidden = false;
  }
  const hinweisListe = liste => h("ul", {class:"hinweisliste"}, liste.slice(0, 20).map(t => h("li", null, t)), liste.length > 20 ? h("li", null, "… und " + (liste.length - 20) + " weitere") : null);

  async function hochladen(){
    if (!geprueft) return;
    const titel = feldTitel.value.replace(/\s+/g, " ").trim(), name = nameBereinigen(feldName.value);
    const neuName = feldModul.value.replace(/\s+/g, " ").trim().slice(0, 40), gleich = module.find(m => m.titel.toLowerCase() === neuName.toLowerCase());
    const modul = wahlModul.value !== "neu" ? {id:wahlModul.value, titel:(module.find(m => m.id === wahlModul.value) || {}).titel || ""}
      : gleich ? {id:gleich.id, titel:gleich.titel} : {id:modulKennung(neuName), titel:neuName};
    const fehlt = titel.length < 2 ? "Gib dem Thema einen Namen." : !name ? "Gib deinen Namen an (2 bis 16 Zeichen)." : !modul.id || !modul.titel ? "Wähle ein Modul oder gib dem neuen Modul einen Namen." : "";
    if (fehlt){ bericht.prepend(h("p", {class:"pruefbericht schlecht"}, fehlt)); return; }
    knopfHoch.disabled = true; knopfHoch.textContent = "Lädt hoch …";
    try {
      const id = await themaHochladen(titel, modul, name, geprueft);
      G.zuletzt = id; sichern();
      bericht.replaceChildren(h("p", {class:"pruefbericht gut"}, "„" + titel + "“ ist hochgeladen und für alle im Kurs spielbar."),
        h("div", {class:"aktionen"}, h("button", {class:"knopf haupt", type:"button", onclick:() => location.reload()}, "Zum Thema")));
      knopfHoch.remove();
    } catch (e) {
      knopfHoch.disabled = false; knopfHoch.textContent = "Für alle hochladen";
      bericht.prepend(h("p", {class:"pruefbericht schlecht"}, e.status === 401 || e.status === 403 ? "Der Kurs lässt das Hochladen noch nicht zu (Firebase-Regeln). Sag dem Admin Bescheid." : e.message && !/Anfrage/.test(e.message) ? e.message : "Hochladen hat nicht geklappt. Bist du online?"));
    }
  }
  const vorlageKopieren = async () => {
    // Manche Browser antworten nie auf die Zwischenablage: nach 1,5 s die Vorlage ins Feld schreiben, damit man sie selbst kopieren kann.
    try { await Promise.race([navigator.clipboard.writeText(VORLAGE), new Promise((_, nein) => setTimeout(() => nein(new Error("Zeit")), 1500))]); vorlageMeldung.textContent = "Kopiert. Jetzt in die KI einfügen."; }
    catch (e) { text.value = VORLAGE; text.focus(); text.select(); geprueft = null; knopfHoch.hidden = true; vorlageMeldung.textContent = "Steht unten im Feld: alles markieren und kopieren."; }
  };
  rahmen("angriff", h("div", {class:"ladenkopf"}, h("button", {class:"knopf klein", type:"button", onclick:angriffsKarte}, "Zurück"), h("h1", {class:"seitentitel"}, "Thema hochladen")),
    h("p", {class:"einstieg"}, "Mach aus deinem Skript oder deinen Notizen ein Thema. Es ist sofort für alle im Kurs spielbar."),
    h("section", {class:"karte"}, h("h2", null, "So geht's"),
      h("ol", {class:"hinweisliste"},
        h("li", null, "Vorlage kopieren."),
        h("li", null, "In ChatGPT, Claude oder Gemini einfügen und dein Lernmaterial anhängen oder darunter einfügen."),
        h("li", null, "Die Antwort der KI kopieren und unten einfügen, oder als Datei speichern und auswählen.")),
      h("div", {class:"aktionen"}, h("button", {class:"knopf gelb", type:"button", onclick:vorlageKopieren}, "Vorlage kopieren"), vorlageMeldung)),
    h("section", {class:"karte hochladen"}, h("h2", null, "Dein Thema"),
      h("label", {class:"leise klein"}, "Name des Themas", feldTitel),
      h("label", {class:"leise klein"}, "Modul", wahlModul), feldModul,
      h("label", {class:"leise klein"}, "Dein Name (steht beim Thema)", feldName),
      text, h("p", {class:"leise klein"}, "Oder Datei wählen: ", datei),
      h("div", {class:"aktionen"}, h("button", {class:"knopf", type:"button", onclick:pruefen}, "Prüfen")),
      bericht, h("div", {class:"aktionen"}, knopfHoch)));
}
