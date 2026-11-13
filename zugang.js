"use strict";
/* =====================================================================
   ZUGANG: das Kurs-Passwort.

   Der Lernstoff kann verschlüsselt ausgeliefert werden. Dann melden die
   Dateien in inhalte/ keine lesbaren Aufgaben an, sondern Pakete in
   LERNSTOFF_GEHEIM. Ohne Passwort ist darin nichts zu lesen, auch nicht
   im Quelltext oder mit den Entwicklerwerkzeugen des Browsers.

   Ablauf beim Start (lernstoffOeffnen):
     1. Hat dieser Browser den Zugang schon einmal geöffnet? Dann sofort weiter.
     2. Steht das Passwort im Link (…/#k=…)? Dann damit öffnen.
     3. Sonst nach dem Passwort fragen.

   Technik: Aus dem Passwort wird mit PBKDF2 ein Schlüssel berechnet,
   der Stoff ist mit AES-GCM verschlüsselt. Gemerkt wird im Browser der
   berechnete Schlüssel, nicht das Passwort.
   Gibt es keine verschlüsselten Pakete, tut diese Datei nichts.
   ===================================================================== */

const ZUGANG_SPEICHER = "chipdorf-zugang";

async function schluesselAus(passwort, salz, runden){
  const roh = await crypto.subtle.importKey("raw", new TextEncoder().encode(passwort), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2", hash:"SHA-256", salt:vonBase64(salz), iterations:runden}, roh, 256));
}
async function entschluessle(paket, schluessel){
  const k = await crypto.subtle.importKey("raw", schluessel, "AES-GCM", false, ["decrypt"]);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM", iv:vonBase64(paket.iv)}, k, vonBase64(paket.daten))));
}
/* Öffnet alle Pakete mit einem Schlüssel. Meldet den Stoff erst an, wenn jedes Paket aufging. */
async function oeffneMit(schluessel){
  const inhalte = []; for (const paket of LERNSTOFF_GEHEIM) inhalte.push(await entschluessle(paket, schluessel));
  for (const inhalt of inhalte){ AUFBAU.push(...(inhalt.aufbau || [])); LERNSTOFF.push(...(inhalt.lernstoff || [])); }
}
/* Probiert ein Passwort. Bei Erfolg merkt sich der Browser den Schlüssel. */
async function versuchePasswort(passwort){
  const {salz, runden} = LERNSTOFF_GEHEIM[0];
  try {
    const schluessel = await schluesselAus(passwort, salz, runden); await oeffneMit(schluessel);
    try { localStorage.setItem(ZUGANG_SPEICHER, JSON.stringify({salz, schluessel:zuBase64(schluessel)})); } catch (e) {}
    return true;
  } catch (e) { return false; }
}
/* Passwort aus dem Link: …/#k=… (verpackt, damit Sonderzeichen in Messengern nicht verloren gehen) oder …/#kurs=… (im Klartext). */
function passwortAusLink(){
  try {
    const verpackt = /[#&]k=([A-Za-z0-9_-]+)/.exec(location.hash), klar = /[#&]kurs=([^&]+)/.exec(location.hash);
    if (verpackt) return new TextDecoder().decode(vonBase64(verpackt[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (klar) return decodeURIComponent(klar[1]);
  } catch (e) {}
  return "";
}
async function lernstoffOeffnen(){
  if (!LERNSTOFF_GEHEIM.length) return;
  const platz = document.getElementById("app"); document.body.dataset.ansicht = "zugang";
  if (!window.crypto || !crypto.subtle){ platz.replaceChildren(h("main", {class:"seite"}, h("section", {class:"karte zugang"}, h("h1", null, "Chipdorf"), h("p", null, "Diese Seite braucht eine sichere Verbindung. Öffne sie über eine Adresse, die mit https:// beginnt.")))); return new Promise(() => {}); }
  try {                                                                       // 1. gemerkter Schlüssel
    const gemerkt = JSON.parse(localStorage.getItem(ZUGANG_SPEICHER) || "null");
    if (gemerkt && gemerkt.salz === LERNSTOFF_GEHEIM[0].salz){ await oeffneMit(vonBase64(gemerkt.schluessel)); return; }
  } catch (e) {}
  const ausLink = passwortAusLink();                                          // 2. Passwort im Link
  if (ausLink){
    const ok = await versuchePasswort(ausLink);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}       // Passwort nicht in der Adresszeile stehen lassen
    if (ok) return;
  }
  await new Promise(fertig => {                                               // 3. fragen
    const feld = h("input", {class:"namensfeld", type:"password", autocomplete:"current-password", "aria-label":"Kurs-Passwort"}), meldung = h("p", {class:"leise klein", role:"status"});
    const knopf = h("button", {class:"knopf haupt", type:"submit"}, "Öffnen");
    platz.replaceChildren(h("main", {class:"seite"}, h("form", {class:"karte zugang", onsubmit:async e => {
        e.preventDefault(); if (!feld.value) return; knopf.disabled = true; meldung.textContent = "Prüfe …";
        if (await versuchePasswort(feld.value)) fertig(); else { knopf.disabled = false; meldung.textContent = "Das Passwort stimmt nicht."; feld.select(); } }},
      h("h1", null, "Chipdorf"), h("p", null, "Dieses Lernspiel gehört zu einem Kurs. Gib das Kurs-Passwort ein."), h("div", {class:"antwort"}, feld, knopf), meldung,
      h("p", {class:"leise klein"}, "Du musst es auf diesem Gerät nur einmal eingeben."))));
    feld.focus();
  });
}
