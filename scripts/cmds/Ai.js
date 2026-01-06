~cmd install ai.js const axios = require("axios");

module.exports = {
  config: {
    name: "ai",
    aliases: ["gpt", "chatgpt", "gpt5"],
    version: "2.5",
    author: "Aryan Chauhan",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Chat with GPT-5" },
    longDescription: { en: "Talk with GPT-5 AI" },
    category: "ai",
    guide: { en: "!ai <msg> | !ai reset" }
  },

  onStart: async ({ api, event, args }) => {
    const q = args.join(" ");
    if (!q) return b(api, event, "⚠ Provide a message.");
    if (q.toLowerCase() === "reset") return c(api, event);
    a(api, event, q, false);
  },

  onReply: async ({ api, event, Reply }) => {
    if (event.senderID !== Reply.author) return;
    const q = event.body;
    if (!q) return;
    if (q.toLowerCase() === "reset") return c(api, event);
    a(api, event, q, false);
  },

  onChat: async ({ api, event }) => {
    const m = (event.body || "").match(/^(ai|gpt|chatgpt|gpt5)\s+(.+)/i);
    if (!m) return;
    const q = m[2].trim();
    if (!q) return;
    if (q.toLowerCase() === "reset") return c(api, event);
    a(api, event, q, false);
  }
};

async function a(api, event, q, r) {
  try {
    const res = await axios.get("https://aryanapi.up.railway.app/api/gpt5", { params: { prompt: q, uid: event.senderID, reset: r ? "true" : "false" } });
    const ans = res.data?.result?.trim();
    if (!ans) return b(api, event, "❌ No response.");

    // Répondre après un délai de 3 secondes
    setTimeout(() => {
      api.sendMessage(ans, event.threadID, (err, info) => {
        if (err) return;
        global.GoatBot.onReply.set(info.messageID, { commandName: "ai", author: event.senderID });
      }, event.messageID);
    }, 3000); // Délai de 3000 millisecondes (3 secondes)

  } catch {
    b(api, event, "❌ Error from AI.");
  }
}

function b(api, event, t) { return api.sendMessage(t, event.threadID, event.messageID); }

async function c(api, event) {
  try {
    await axios.get("https://aryanapi.up.railway.app/api/gpt5", { params: { prompt: "reset", uid: event.senderID, reset: "true" } });
    b(api, event, "✅ Memory reset!");
  } catch {
    b(api, event, "❌ Reset failed.");
  }
}
