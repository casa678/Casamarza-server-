require("dotenv").config(); // Corrigé : minuscule sur 'require'
const express = require("express");
const bodyParser = require("body-parser");
const { WebSocketServer } = require("ws");
const http = require("http");
const twilio = require("twilio");
const { OpenAI } = require("openai");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sessions = {};
const dashboardClients = new Set();

wss.on("connection", (ws) => {
  dashboardClients.add(ws);
  ws.on("close", () => dashboardClients.delete(ws));
});

function broadcastToDashboard(data) {
  const msg = JSON.stringify(data);
  for (const client of dashboardClients) {
    if (client.readyState === 1) client.send(msg);
  }
}

function getAvailableSlots() {
  const now = new Date();
  const slots = [];
  for (let h = 18; h < 21; h++) {
    for (let m = 0; m < 60; m += 15) {
      const slotMinutes = h * 60 + m;
      const nowMinutes = now.getHours() * 60 + now.getMinutes() + 15;
      if (slotMinutes >= nowMinutes) {
        slots.push(`${String(h).padStart(2,"0")}h${String(m).padStart(2,"0")}`);
      }
    }
  }
  return slots;
}

function buildSystemPrompt() {
  const slots = getAvailableSlots();
  const slotsStr = slots.length > 0 ? slots.slice(0, 8).join(", ") : "aucun créneau disponible";
  
  // CORRECTION : Utilisation des backticks pour le texte multi-lignes
  return `Tu es l'assistant téléphonique de Casa Marza, food truck pizza artisanal.
Tu prends les commandes en français, ton chaleureux et professionnel.

CRENEAUX DISPONIBLES : ${slotsStr}

SCRIPT :
1. "Casa Marza bonjour !"
2. "Que souhaitez-vous commander ?"
3. Prendre la commande complète
4. "Pour quelle heure voulez-vous ?"
5. "Faut-il couper les pizzas ?"
6. "Parfait, confirmé pour [Heure]"`;
}

// Configuration du port pour Railway
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`L'application est lancée sur le port ${PORT}`);
});
