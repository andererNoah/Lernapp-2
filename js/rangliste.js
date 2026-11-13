"use strict";
/* =====================================================================
   RANGLISTE: Verbindung zum gemeinsamen Punktestand im Internet.
   Nur diese Datei spricht mit dem Dienst (Firebase, per einfacher Web-Anfrage).

   So läuft es ab:
     1. Beim ersten Mitmachen legt der Dienst ein namenloses Konto an.
        Es gehört zu diesem Spielstand (G.konto) und wandert beim
        Übertragen des Spielstands mit.
     2. Nach jeder Runde schickt das Spiel einen Eintrag:
        Name, Punkte dieser Woche, Erfahrung, Klausurreife, Sterne.
        Jeder kann nur seinen eigenen Eintrag schreiben (firebase-regeln.json).
     3. Die Ansicht "Rangliste" lädt alle Einträge des Kurses.

   Ohne Angaben in konfig.js ist alles hier ausgeschaltet.
   ===================================================================== */

const RL = (typeof KONFIG !== "undefined" && KONFIG.rangliste) || {};          // fehlt konfig.js, bleibt die Rangliste einfach aus
const ranglisteAn = () => !!(RL.apiKey && RL.datenbank);
const ranglistePfad = uid => RL.datenbank.replace(/\/+$/, "") + "/rangliste/" + encodeURIComponent(RL.kurs || "kurs1") + (uid ? "/" + uid : "") + ".json";
let kontoToken = null;                                  // Ausweis für Schreibzugriffe, gilt etwa eine Stunde; bleibt nur im Arbeitsspeicher

async function anfrage(url, optionen){
  const antwort = await fetch(url, optionen);
  if (!antwort.ok){ const fehler = new Error("Anfrage fehlgeschlagen: " + antwort.status); fehler.status = antwort.status; throw fehler; }
  return antwort.json();
}
/* Gibt einen gültigen Ausweis zurück. Legt beim ersten Mal ein namenloses Konto an, danach wird der Ausweis nur erneuert. */
async function kontoAusweis(){
  if (kontoToken && kontoToken.bis > Date.now() + 60000) return kontoToken.wert;
  const schluessel = encodeURIComponent(RL.apiKey);
  if (G.konto && G.konto.erneuern){
    try {
      const a = await anfrage("https://securetoken.googleapis.com/v1/token?key=" + schluessel, {method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},
        body:"grant_type=refresh_token&refresh_token=" + encodeURIComponent(G.konto.erneuern)});
      G.konto = {uid:a.user_id, erneuern:a.refresh_token}; kontoToken = {wert:a.id_token, bis:Date.now() + 1000 * (+a.expires_in || 3600)}; sichern();
      return kontoToken.wert;
    } catch (e) { if (e.status !== 400) throw e; }       // 400: Konto gibt es nicht mehr → unten ein neues anlegen
  }
  const a = await anfrage("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + schluessel, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({returnSecureToken:true})});
  G.konto = {uid:a.localId, erneuern:a.refreshToken}; kontoToken = {wert:a.idToken, bis:Date.now() + 1000 * (+a.expiresIn || 3600)}; sichern();
  return kontoToken.wert;
}
/* Was über dich in der Rangliste steht. Ältere Sicherheitsregeln kennen die neueren Felder noch nicht; dann wird stufenweise weniger geschickt:
   Stufe 3: alles, Stufe 2: ohne Chips und Antwortzahlen, Stufe 1: auch ohne Figur, Stufe 0: nur die Grundfelder.
   punkte, woche und reife werden nicht mehr angezeigt, aber ältere Regeln verlangen sie. */
function ranglisteEintrag(stufe){
  const l = lernstand(ALLE_AUFGABEN), e = {name:G.name, punkte:0, woche:0, xp:G.xp, reife:Math.round(100 * l.fest / l.gesamt), sterne:sterneGesamt(), zeit:{".sv":"timestamp"}};
  if (stufe >= 1) e.fest = l.fest;
  if (stufe >= 2) e.figur = trachtAlsText(G.tracht);
  if (stufe >= 3){ e.chips = Math.max(0, Math.round(G.verdient)); e.richtig = G.zaehler.richtig; e.falsch = G.zaehler.falsch; }
  return e;
}
let regelStufe = 3;                                     // sinkt, wenn die Sicherheitsregeln ein Feld ablehnen
/* Eigenen Eintrag schicken. Macht nichts, solange die Rangliste aus ist oder du keinen Namen gewählt hast. */
async function ranglisteMelden(){
  if (!ranglisteAn() || !G.name) return false;
  const ausweis = await kontoAusweis();
  for (;;){
    try { await anfrage(ranglistePfad(G.konto.uid) + "?auth=" + encodeURIComponent(ausweis), {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(ranglisteEintrag(regelStufe))}); return true; }
    catch (e) { if (regelStufe > 0 && e.status >= 400 && e.status < 500) regelStufe--; else throw e; }       // abgelehnt: vermutlich ältere Regeln → mit weniger Feldern noch einmal
  }
}
/* Meldet im Hintergrund, z. B. nach einer Runde. Fehler stören das Spiel nicht. */
function ranglisteMeldenLeise(){ ranglisteMelden().catch(() => {}); }
/* Eigenen Eintrag löschen. */
async function ranglisteAustragen(){
  if (ranglisteAn() && G.konto){ const ausweis = await kontoAusweis(); await anfrage(ranglistePfad(G.konto.uid) + "?auth=" + encodeURIComponent(ausweis), {method:"DELETE"}); }
  G.name = ""; sichern();
}
/* Alle Einträge des Kurses. quote = Anteil auf Anhieb richtiger Antworten in Prozent, gewertet ab 20 Antworten. */
async function ranglisteLaden(){
  const roh = await anfrage(ranglistePfad()) || {};
  return Object.keys(roh).map(uid => { const e = roh[uid] || {};
    const richtig = +e.richtig || 0, falsch = +e.falsch || 0, n = richtig + falsch;
    return {uid, name:String(e.name || "?").slice(0, 16), chips:+e.chips || 0, richtig, falsch, quote:n ? Math.round(100 * richtig / n) : 0, gewertet:n >= 20, xp:+e.xp || 0, tracht:trachtAusText(e.figur), ich:!!G.konto && uid === G.konto.uid}; });
}
/* Prüft einen Spielernamen. Gibt den bereinigten Namen zurück oder "" bei ungültiger Eingabe. */
function nameBereinigen(text){ const n = String(text || "").replace(/\s+/g, " ").trim(); return n.length >= 2 && n.length <= 16 ? n : ""; }

/* ---------- Spielstand als Code: sichern und auf einem anderen Gerät laden ---------- */
const CODE_VORSATZ = "CHIPDORF4";
async function durchStrom(bytes, strom){ return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(strom)).arrayBuffer()); }
/* Der Spielstand als Text. Wird gepackt, wenn der Browser das kann ("z"), sonst ungepackt ("u"). */
async function spielstandCode(){
  const bytes = new TextEncoder().encode(JSON.stringify(G));
  try { if (typeof CompressionStream === "function") return CODE_VORSATZ + "z:" + zuBase64(await durchStrom(bytes, new CompressionStream("deflate-raw"))); } catch (e) {}
  return CODE_VORSATZ + "u:" + zuBase64(bytes);
}
/* Liest einen Code. Gibt einen vollständigen Spielstand zurück oder null, wenn der Code nicht passt. */
async function spielstandAusCode(code){
  try {
    const m = /^CHIPDORF4([zu]):([A-Za-z0-9+/=]+)$/.exec(String(code).replace(/\s+/g, "")); if (!m) return null;
    let bytes = vonBase64(m[2]); if (m[1] === "z") bytes = await durchStrom(bytes, new DecompressionStream("deflate-raw"));
    return standAus(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (e) { return null; }
}
