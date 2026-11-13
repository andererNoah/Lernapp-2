"use strict";
/* =====================================================================
   EINSTELLUNGEN für die gemeinsame Rangliste.

   Die Rangliste braucht einen Ort im Internet, an dem die Punkte aller
   Mitspieler liegen. Das Spiel nutzt dafür ein kostenloses Firebase-Projekt
   (Google). Wie du es anlegst, steht Schritt für Schritt in LIESMICH.md.

   Solange apiKey und datenbank leer sind, bleibt die Rangliste ausgeschaltet;
   alles andere funktioniert wie gewohnt.

   Beide Werte dürfen öffentlich sein. Wer was schreiben darf, regeln die
   Sicherheitsregeln in firebase-regeln.json, nicht diese Datei.
   ===================================================================== */
const KONFIG = {
  rangliste: {
    apiKey: "AIzaSyBhQmGP1fQXfG7okkHlfstl4m5Sbs3CMrM",          // "Web-API-Schlüssel" aus den Projekteinstellungen, z. B. "AIzaSy..."
    datenbank: "https://lernapp-ranglsite-default-rtdb.europe-west1.firebasedatabase.app/",       // Adresse der Realtime Database, z. B. "https://mein-projekt-default-rtdb.europe-west1.firebasedatabase.app"
    admin: "",           // deine Kennung (steht in der Spiele-Ecke ganz unten). Wer hier steht, darf Wetten anlegen; dieselbe Kennung muss in den Firebase-Regeln stehen.
    kurs: "kurs1"        // Name der Liste. Ein anderer Name ergibt eine eigene, getrennte Rangliste (nur Buchstaben, Ziffern, Bindestrich).
  }
};
