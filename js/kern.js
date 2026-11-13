"use strict";
/* =====================================================================
   KERN: kleine Helfer, die alle anderen Dateien benutzen.
   Reihenfolge der Dateien (siehe index.html):
     kern.js → konfig.js → inhalte/*.js → aufgaben.js → lernstoff.js
     → lernplan.js → anreize.js → effekte.js → figur.js → rangliste.js → zugang.js → spielecke.js → spiel.js
   ===================================================================== */

/* Hier melden die Dateien aus inhalte/ an, was sie mitbringen:
   AUFBAU           Module und Themen mit Namen und Reihenfolge (aufbau.js)
   LERNSTOFF        je Datei ein Thema mit Kapiteln und Aufgaben
   LERNSTOFF_GEHEIM dasselbe verschlüsselt; wird nach Eingabe des Kurs-Passworts ausgepackt (zugang.js) */
const AUFBAU = [], LERNSTOFF = [], LERNSTOFF_GEHEIM = [];

/* Bytes als Text verpacken und zurück (für verschlüsselten Lernstoff und den Spielstand-Code). */
const zuBase64 = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(s); };
const vonBase64 = text => Uint8Array.from(atob(text), z => z.charCodeAt(0));

/* Baut ein HTML-Element: h("p", {class:"x"}, "Text", weitereKinder) */
function h(tag, props, ...kinder){
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)){
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kind of kinder.flat(Infinity)){
    if (kind == null || kind === false) continue;
    el.append(kind.nodeType ? kind : document.createTextNode(String(kind)));
  }
  return el;
}

function mischen(liste){
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/* Wie mischen(), aber nie in der Ausgangsreihenfolge (für Reihenfolge-Aufgaben). */
function mischenAnders(liste){
  if (liste.length < 2) return liste.slice();
  let a; do { a = mischen(liste); } while (a.every((x, i) => x === liste[i]));
  return a;
}
const zufall = (von, bis) => von + Math.floor(Math.random() * (bis - von + 1));
const zahl = n => Math.round(n).toLocaleString("de-DE");
const komma = n => String(n).replace(".", ",");

/* Kurzer, stabiler Schlüssel aus einem Text. Damit behält eine Aufgabe ihren
   Lernstand, auch wenn in der Inhaltsdatei Aufgaben dazukommen oder umziehen. */
function kurzschluessel(text){
  let x = 5381;
  for (let i = 0; i < text.length; i++) x = ((x << 5) + x + text.charCodeAt(i)) >>> 0;
  return x.toString(36);
}

/* Tastenkürzel der gerade sichtbaren Aufgabe (z. B. Ziffern für Antworten). */
let tastenhaken = null;
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target && e.target.matches && e.target.matches("input,textarea")) return;
  if (tastenhaken) tastenhaken(e);
});

/* Zufallszahlen, die bei gleicher Saat immer gleich ausfallen (z. B. für die Tagesaufträge). */
function zufallMitSaat(saat){
  let a = saat >>> 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
