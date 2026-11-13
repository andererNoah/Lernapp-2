"use strict";
/* =====================================================================
   EFFEKTE: Töne, Konfetti, hochzählende Zahlen, Symbole.
   Effekte gibt es nur als Antwort auf Erfolg oder Misserfolg, nie als Dauerberieselung.
   ===================================================================== */

const RUHIG = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Kurze Töne aus dem Browser, ohne Dateien. */
let klang = null;
const NOTEN = {klick:[[520, .04]], richtig:[[660, .08], [880, .13]], falsch:[[196, .18]], welle:[[330, .06], [494, .08]], treffer:[[140, .07]],
  sieg:[[523, .1], [659, .1], [784, .1], [1047, .24]], verloren:[[330, .14], [247, .22]], truhe:[[784, .07], [988, .07], [1175, .07], [1568, .2]],
  aufstieg:[[523, .09], [784, .09], [1047, .09], [1319, .26]], muenze:[[1175, .05], [1568, .09]]};
function ton(art){
  if (!G.ton) return;
  try {
    klang = klang || new (window.AudioContext || window.webkitAudioContext)(); if (klang.state === "suspended") klang.resume();
    let t = klang.currentTime;
    for (const [frequenz, dauer] of NOTEN[art]){
      const o = klang.createOscillator(), g = klang.createGain();
      o.type = art === "falsch" || art === "verloren" || art === "treffer" ? "sawtooth" : "triangle"; o.frequency.value = frequenz;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.14, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dauer);
      o.connect(g); g.connect(klang.destination); o.start(t); o.stop(t + dauer + .03); t += dauer * .9;
    }
  } catch (e) {}
}

/* Konfetti über die ganze Seite, etwa anderthalb Sekunden. */
function konfetti(){
  if (RUHIG) return;
  const cv = document.createElement("canvas"); cv.className = "konfetti"; cv.width = innerWidth; cv.height = innerHeight; document.body.append(cv);
  const ctx = cv.getContext("2d"), farben = ["#FFC933", "#58C431", "#3FA9FF", "#F45B4B", "#B36BFF", "#FFFFFF"];
  const teile = Array.from({length:110}, () => ({x:innerWidth / 2 + (Math.random() - .5) * 120, y:innerHeight * .35, vx:(Math.random() - .5) * 14, vy:-Math.random() * 13 - 3, g:6 + Math.random() * 7, w:Math.random() * 6.28, f:farben[Math.floor(Math.random() * 6)]}));
  const start = performance.now();
  (function bild(jetzt){
    const t = (jetzt - start) / 1000; ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of teile){ p.x += p.vx; p.y += p.vy; p.vy += .45; p.vx *= .985; p.w += .2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.w); ctx.globalAlpha = Math.max(0, 1 - t / 1.7); ctx.fillStyle = p.f; ctx.fillRect(-p.g / 2, -p.g / 3, p.g, p.g * .66); ctx.restore(); }
    if (t < 1.7) requestAnimationFrame(bild); else cv.remove();
  })(start);
}

/* Zahl von einem Wert zum anderen hochzählen. */
function zaehleHoch(el, von, bis, vorsatz){
  if (RUHIG || von === bis){ el.textContent = (vorsatz || "") + zahl(bis); return; }
  const start = performance.now(), dauer = 700;
  (function bild(jetzt){ const t = Math.min(1, (jetzt - start) / dauer), w = von + (bis - von) * (1 - Math.pow(1 - t, 3)); el.textContent = (vorsatz || "") + zahl(w); if (t < 1) requestAnimationFrame(bild); })(start);
}

/* Symbole als kleine Vektorgrafiken. */
const SYMBOL = {
  blitz:"M13.5 2 4 14h6.2L9 22l10.5-12.5h-6.3z", stern:"M12 2.2l3 6.4 7 .9-5.1 4.8 1.3 6.9L12 17.9 5.8 21.2l1.3-6.9L2 9.5l7-.9z",
  flamme:"M12 2c1.2 4 5.5 5.6 5.5 11.2A5.5 5.5 0 0 1 6.5 13c0-2.2 1-3.9 2.2-5 .3 2.2 1.3 3.1 2.2 3.3.5-3.3-1-6.2 1.1-9.3z",
  haus:"M3 11.2 12 3l9 8.2V21h-6.2v-6.2H9.2V21H3z", schwert:"M19.8 2.5 21.5 4.2 11 14.7l1.6 1.6-1.4 1.4-1.9-1.9-3.4 3.4-2.5-2.5 3.4-3.4-1.9-1.9 1.4-1.4 1.6 1.6z",
  schild:"M12 2 4 5v6.2c0 5 3.4 8.9 8 10.8 4.6-1.9 8-5.8 8-10.8V5z", pokal:"M6.5 3h11v2.5H21v3a4.2 4.2 0 0 1-4.1 4.2A5.3 5.3 0 0 1 13.2 16v2.6h3.3V21h-9v-2.4h3.3V16a5.3 5.3 0 0 1-3.7-3.3A4.2 4.2 0 0 1 3 8.5v-3h3.5zm0 4.4H5v1.1c0 1 .6 1.8 1.5 2.1zm11 0v3.2c.9-.3 1.5-1.1 1.5-2.1V7.4z",
  haken:"M9.3 16.6 4.9 12.2l-1.9 1.9 6.3 6.3L21 8.7l-1.9-1.9z",
  daten:"M8 2h2v3h4V2h2v3h1.5A1.5 1.5 0 0 1 19 6.5V8h3v2h-3v4h3v2h-3v1.5a1.5 1.5 0 0 1-1.5 1.5H16v3h-2v-3h-4v3H8v-3H6.5A1.5 1.5 0 0 1 5 17.5V16H2v-2h3v-4H2V8h3V6.5A1.5 1.5 0 0 1 6.5 5H8zm1 7v6h6V9z",
  balken:"M3.5 21V12h4.6v9zm6.2 0V3h4.6v18zm6.2 0V8h4.6v13z",
  figur:"M12 2.5a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2zM3.5 21.5c.4-5 3.9-7.8 8.5-7.8s8.1 2.8 8.5 7.8z",
  karte:"M9 3.5 3 5.6v14.9l6-2.1 6 2.1 6-2.1V3.5l-6 2.1zm0 2.4 6 2.1v10.1l-6-2.1z", schloss:"M7 10V7.5a5 5 0 0 1 10 0V10h1.5v11h-13V10zm2.5 0h5V7.5a2.5 2.5 0 0 0-5 0z"
};
function symbol(name, klasse){
  const s = document.createElement("span"); s.className = "symbol " + (klasse || ""); s.setAttribute("aria-hidden", "true");
  s.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + SYMBOL[name] + '"/></svg>'; return s;
}
/* Eine gezeichnete Truhe (nur Formen und Farben). */
function truheBild(art){ return h("span", {class:"truhe " + art, "aria-hidden":"true"}, h("span", {class:"deckel"}), h("span", {class:"kasten"}, h("span", {class:"riegel"}))); }
