"use strict";
/* =====================================================================
   LERNSTOFF PRÜFEN UND AUFBEREITEN
   Nimmt alles, was die Dateien in inhalte/ angemeldet haben, und baut daraus
     MODULE_ALLE → alle Module aus aufbau.js, auch Platzhalter ohne Inhalt
     MODULE      → Module mit mindestens einem spielbaren Thema
     THEMEN      → alle spielbaren Themen
     KAPITEL     → alle Kapitel
     ALLE_AUFGABEN

   Namen und Reihenfolge kommen aus inhalte/aufbau.js, der Stoff aus je
   einer Datei pro Thema. Ein Thema, das in aufbau.js steht, aber noch
   keine Datei hat, erscheint als Platzhalter (modul.folgt).

   Damit eine fehlerhafte Erweiterung das Spiel nicht zerstört, wird hier
   alles geprüft. Was nicht passt (doppelte id, unbekannter Aufgabentyp,
   fehlendes Feld), wird übersprungen und in LERNSTOFF_HINWEISE notiert.
   Der Rest läuft normal weiter. Die Hinweise zeigt die Seite, wenn man
   ?pruefen an die Adresse hängt.

   Woran der Fortschritt der Spieler hängt (deshalb nie ändern):
     Sterne          → id des Kapitels
     Lernfortschritt → id des Kapitels + Kennung der Aufgabe
                       (kennung, sonst aus Typ und Fragetext berechnet)
     Boss            → id des Themas
     Klausurtermin   → id des Moduls
   ===================================================================== */

const LERNSTOFF_HINWEISE = [];
/* Was eine Aufgabe je Typ mindestens braucht. */
const AUFGABE_VOLLSTAENDIG = {
  wahl:        a => typeof a.frage === "string" && Array.isArray(a.antworten) && a.antworten.length >= 2,
  wahrfalsch:  a => typeof a.frage === "string" && typeof a.stimmt === "boolean",
  luecke:      a => typeof a.text === "string" && /\{[^}]+\}/.test(a.text) && Array.isArray(a.falsch),
  gruppen:     a => typeof a.frage === "string" && !!a.gruppen && Object.keys(a.gruppen).length >= 2 && Object.values(a.gruppen).every(g => Array.isArray(g) && g.length > 0),
  reihenfolge: a => typeof a.frage === "string" && Array.isArray(a.schritte) && a.schritte.length >= 2,
  paare:       a => typeof a.frage === "string" && Array.isArray(a.paare) && a.paare.length >= 2 && a.paare.every(p => Array.isArray(p) && p.length === 2),
  schema:      a => typeof a.frage === "string" && Array.isArray(a.zeilen) && a.zeilen.every(Array.isArray) && a.zeilen.flat().some(z => String(z).startsWith("?")),
  eingabe:     a => typeof a.frage === "string" && (typeof a.zahl === "number" || (Array.isArray(a.text) && a.text.length > 0)),
  schalter:    a => typeof a.frage === "string" && /^[01]{8}$/.test(a.bits || ""),
  tabelle:     a => typeof a.frage === "string" && Array.isArray(a.ausgang) && a.ausgang.length === 4,
  erklaeren:   a => typeof a.frage === "string" && Array.isArray(a.punkte) && a.punkte.length > 0 && (a.worte == null || (Array.isArray(a.worte) && a.worte.length === a.punkte.length && a.worte.every(w => typeof w === "string" && w))),
  rechnen:     a => ["dez-dual", "dual-dez", "hex-dez", "dez-hex", "zweier", "zweier-lesen"].includes(a.art)
};
const MODULE_ALLE = [], MODULE = [], THEMEN = [], KAPITEL = [], ALLE_AUFGABEN = [];

/* Wird einmal beim Start aufgerufen, sobald der Lernstoff geladen (und, falls nötig, entsperrt) ist. */
function bereiteLernstoffAuf(){
  [LERNSTOFF_HINWEISE, MODULE_ALLE, MODULE, THEMEN, KAPITEL, ALLE_AUFGABEN].forEach(liste => { liste.length = 0; });
  const gueltigeId = id => typeof id === "string" && /^[a-z0-9-]+$/.test(id), kapitelIds = new Set(), geprueft = new Map();
  const hinweis = (wo, was) => LERNSTOFF_HINWEISE.push(wo + ": " + was);

  /* 1. Jedes Thema für sich prüfen. */
  for (const thema of LERNSTOFF){
    const wo = "Thema „" + (thema && (thema.titel || thema.id)) + "“";
    if (!thema || !gueltigeId(thema.id) || !Array.isArray(thema.kapitel)){ hinweis(wo, "id oder kapitel fehlt (id nur aus Kleinbuchstaben, Ziffern, Bindestrich). Thema übersprungen."); continue; }
    if (geprueft.has(thema.id)){ hinweis(wo, "Die id „" + thema.id + "“ ist schon vergeben. Thema übersprungen."); continue; }
    const kapitel = [];
    for (const k of thema.kapitel){
      const woK = wo + ", Kapitel „" + (k && (k.titel || k.id)) + "“";
      if (!k || !gueltigeId(k.id) || typeof k.titel !== "string" || !Array.isArray(k.aufgaben)){ hinweis(woK, "id, titel oder aufgaben fehlt. Kapitel übersprungen."); continue; }
      if (kapitelIds.has(k.id)){ hinweis(woK, "Die id „" + k.id + "“ ist schon vergeben. Kapitel übersprungen."); continue; }
      const aufgaben = [], kennungen = new Set();
      k.aufgaben.forEach((a, i) => {
        const woA = woK + ", Aufgabe " + (i + 1);
        if (!a || !AUFGABE_VOLLSTAENDIG[a.typ]){ hinweis(woA, "unbekannter Typ „" + (a && a.typ) + "“. Aufgabe übersprungen."); return; }
        let kennung;
        try { if (!AUFGABE_VOLLSTAENDIG[a.typ](a)) throw 0; kennung = a.kennung || kurzschluessel(a.typ + "|" + frageText(a)); }
        catch (e) { hinweis(woA, "Für den Typ „" + a.typ + "“ fehlt ein Feld oder es hat die falsche Form. Aufgabe übersprungen."); return; }
        if (kennungen.has(kennung)){ hinweis(woA, "gleicher Typ und gleicher Fragetext wie eine frühere Aufgabe im Kapitel. Aufgabe übersprungen."); return; }
        kennungen.add(kennung); a.id = k.id + ":" + kennung; aufgaben.push(a);
      });
      if (!aufgaben.length){ hinweis(woK, "keine gültige Aufgabe. Kapitel übersprungen."); continue; }
      kapitelIds.add(k.id); k.aufgaben = aufgaben; k.thema = thema; kapitel.push(k);
    }
    if (!kapitel.length){ hinweis(wo, "kein gültiges Kapitel. Thema übersprungen."); continue; }
    thema.kapitel = kapitel; geprueft.set(thema.id, thema);
  }

  /* 2. Module und Themen in der Reihenfolge aus aufbau.js einsortieren. Dort stehen auch die Namen. */
  const zugeordnet = new Set();
  const modulMit = (id, titel) => { let m = MODULE_ALLE.find(x => x.id === id); if (!m){ m = {id, titel:titel || id, themen:[], folgt:[]}; MODULE_ALLE.push(m); } return m; };
  const ordneZu = (thema, modul, titel) => { thema.titel = titel || thema.titel || thema.id; thema.modul = modul; modul.themen.push(thema); zugeordnet.add(thema.id); };
  for (const eintrag of AUFBAU){
    if (!eintrag || !gueltigeId(eintrag.id)){ hinweis("Aufbau", "Ein Modul hat keine gültige id. Modul übersprungen."); continue; }
    if (MODULE_ALLE.some(m => m.id === eintrag.id)){ hinweis("Aufbau", "Die Modul-id „" + eintrag.id + "“ ist doppelt. Zweiter Eintrag übersprungen."); continue; }
    const modul = modulMit(eintrag.id, eintrag.titel);
    for (const t of eintrag.themen || []){
      const thema = t && geprueft.get(t.id);
      if (thema && !zugeordnet.has(thema.id)) ordneZu(thema, modul, t.titel);
      else if (t && gueltigeId(t.id) && !thema) modul.folgt.push({id:t.id, titel:t.titel || "folgt"});          // noch ohne Datei: Platzhalter
    }
  }
  /* 3. Themen, die in aufbau.js fehlen, hängen an dem Modul, das sie selbst nennen. */
  for (const thema of geprueft.values()){
    if (zugeordnet.has(thema.id)) continue;
    const eigen = typeof thema.modul === "string" ? {id:thema.modul} : thema.modul && gueltigeId(thema.modul.id) ? thema.modul : {id:"allgemein", titel:"Allgemein"};
    ordneZu(thema, modulMit(gueltigeId(eigen.id) ? eigen.id : "allgemein", eigen.titel));
  }
  MODULE.push(...MODULE_ALLE.filter(m => m.themen.length)); THEMEN.push(...MODULE.flatMap(m => m.themen));
  KAPITEL.push(...THEMEN.flatMap(t => t.kapitel)); ALLE_AUFGABEN.push(...KAPITEL.flatMap(k => k.aufgaben));
  if (LERNSTOFF_HINWEISE.length) console.warn("Lernstoff: " + LERNSTOFF_HINWEISE.length + " Hinweise\n" + LERNSTOFF_HINWEISE.join("\n"));
}

const aufgabenVon = modul => modul.themen.flatMap(t => t.kapitel).flatMap(k => k.aufgaben);

/* Übersicht für den, der den Lernstoff pflegt: Adresse der Seite + ?pruefen */
function lernstoffBericht(){
  const zeile = text => h("li", null, text);
  return h("main", {class:"seite bericht"},
    h("h1", {class:"seitentitel"}, "Lernstoff prüfen"),
    h("section", {class:"karte"}, h("h2", null, LERNSTOFF_HINWEISE.length ? LERNSTOFF_HINWEISE.length + " Hinweise" : "Alles in Ordnung"),
      LERNSTOFF_HINWEISE.length ? h("ul", {class:"hinweisliste"}, LERNSTOFF_HINWEISE.map(zeile)) : h("p", null, "Jede Aufgabe ist vollständig, keine id ist doppelt vergeben."),
      h("p", {class:"leise klein"}, "Übersprungenes fehlt im Spiel, alles andere läuft normal. Der Fortschritt der Spieler bleibt erhalten, solange die ids gleich bleiben.")),
    MODULE_ALLE.map(m => h("section", {class:"karte"}, h("p", {class:"leise"}, "Modul, id „" + m.id + "“" + (m.themen.length ? "" : ", Platzhalter")), h("h2", null, m.titel),
      m.themen.map(t => h("div", {class:"berichtthema"}, h("h3", null, t.titel, h("span", {class:"stufe"}, " id „" + t.id + "“, " + t.kapitel.reduce((n, k) => n + k.aufgaben.length, 0) + " Aufgaben")),
        h("ul", {class:"hinweisliste"}, t.kapitel.map(k => { const typen = {}; k.aufgaben.forEach(a => typen[a.typ] = (typen[a.typ] || 0) + 1);
          return zeile(k.titel + " (id „" + k.id + "“): " + k.aufgaben.length + " Aufgaben. " + Object.keys(typen).map(typ => typen[typ] + " " + typ).join(", ")); })))),
      m.folgt.length ? h("p", {class:"leise klein"}, "Platzhalter für Themen: " + m.folgt.map(t => t.titel + " (id „" + t.id + "“)").join(", ")) : null)),
    h("p", {class:"einstieg"}, h("a", {class:"textknopf", href:location.pathname}, "Zum Spiel")));
}
