const axios = require("axios");

// ⚠️ Keep your API key safe — don't expose it publicly
const GEMINI_API_KEY = "AIzaSyAXoP6bgNnxSznqBGzhKCTEy4pDkzoceek";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

module.exports.config = {
  name: "gemini2",
  version: "1.0.0",
  role: 0,
  author: "Ew'r Saim",
  description: "Gemini 2.0 Flash AI with direct API integration and multiple conversation support",
  usePrefix: true,
  guide: "[message]",
  category: "ai",
  coolDowns: 5,
};

const conversationHistory = new Map();

function getConversationHistory(senderID) {
  if (!conversationHistory.has(senderID)) {
    conversationHistory.set(senderID, []);
  }
  return conversationHistory.get(senderID);
}

function updateConversationHistory(senderID, role, text) {
  const history = getConversationHistory(senderID);
  history.push({
    parts: [{ text: text }],
    role: role,
  });
  if (history.length > 20) {
    history.shift();
  }
}

module.exports.onReply = async function ({ api, event, Reply }) {
  const { author } = Reply;
  if (author !== event.senderID) return;

  const uid = event.senderID;
  const userMessage = event.body.toLowerCase();

  try {
    const history = getConversationHistory(uid);
    updateConversationHistory(uid, "user", userMessage);

    const requestBody = {
      contents: [
        ...history,
        {
          parts: [{ text: userMessage }],
          role: "user",
        },
      ],
    };

    const response = await axios.post(GEMINI_API_URL, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    });

    const aiResponse = response.data.candidates[0].content.parts[0].text;

    updateConversationHistory(uid, "model", aiResponse);

    const styledMessage =
      `\n` +
      `\n` +
      `${aiResponse}\n` +
      `` +
      ``;

    await api.sendMessage(
      styledMessage,
      event.threadID,
      (error, info) => {
        if (!error) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            type: "reply",
            messageID: info.messageID,
            author: event.senderID,
          });
        }
      },
      event.messageID
    );
  } catch (error) {
    console.error(`Error in gemini3 onReply: ${error.message}`);
    if (error.response && error.response.data) {
      api.sendMessage(
        `❌ Error: ${error.response.data.error.message}`,
        event.threadID,
        event.messageID
      );
    } else {
      api.sendMessage(
        `❌ Unexpected error: ${error.message}`,
        event.threadID,
        event.messageID
      );
    }
  }
};

module.exports.onStart = async function ({ api, args, event }) {
  const uid = event.senderID;
  const userMessage = args.join(" ").toLowerCase();

  try {
    if (!userMessage) {
      api.sendMessage(
        "Please provide a question for Gemini 2.0 Flash.\n\nExample:\ngemini3 What is the capital of Bangladesh?",
        event.threadID,
        event.messageID
      );
      return;
    }

    conversationHistory.set(uid, []);
    updateConversationHistory(uid, "user", userMessage);

    const requestBody = {
      contents: [
        {
          parts: [{ text: userMessage }],
          role: "user",
        },
      ],
    };

    const response = await axios.post(GEMINI_API_URL, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    });

    const aiResponse = response.data.candidates[0].content.parts[0].text;

    updateConversationHistory(uid, "model", aiResponse);

    const styledMessage =
      `\n` +
      `` +
      `${aiResponse}\n` +
      ``;

    await api.sendMessage(
      { body: styledMessage },
      event.threadID,
      (error, info) => {
        if (!error) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            type: "reply",
            messageID: info.messageID,
            author: event.senderID,
          });
        }
      },
      event.messageID
    );
  } catch (error) {
    console.error(`Error in gemini3 onStart: ${error.message}`);
    if (error.response && error.response.data) {
      api.sendMessage(
        `❌ Error: ${error.response.data.error.message}`,
        event.threadID,
        event.messageID
      );
    } else {
      api.sendMessage(
        `❌ Unexpected error: ${error.message}`,
        event.threadID,
        event.messageID
      );
    }
  }
};