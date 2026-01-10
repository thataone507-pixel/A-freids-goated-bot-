const axios = require("axios");
const fs = require("fs");
const path = require("path");

const GoatMart = "https://goatmart.vercel.app";

module.exports = {
  config: {
    name: "goatmart",
    aliases: ["gm"],
    shortDescription: { en: "🌟 GoatMart - Your Command Marketplace" },
    longDescription: { en: "✨ Browse, search, upload, and manage commands in the GoatMart marketplace." },
    category: "utility",
    version: "2.2",
    role: 0,
    author: "Aryan Chauhan",
    cooldowns: 0,
  },

  onStart: async ({ api, event, args, message }) => {
    const a = (content) => {
      const h = "╭───『 🐐 𝗚𝗼𝗮𝘁𝗠𝗮𝗿𝘁 』───╮\n";
      const f = "\n╰─────────────╯";
      return message.reply(h + content + f);
    };

    const b = (error, action) => {
      console.error(`GoatMart ${action} error:`, error);

      if (error.response?.status === 503) return a("\n🚧 Service under maintenance. Please try again later.");
      if (error.response?.status === 404) return a(`\n❌ Not found: The requested resource doesn't exist.`);
      if (error.response?.status === 500) return a(`\n⚠️ Server error: Please try again in a few moments.`);

      if (["ECONNREFUSED", "ENOTFOUND"].includes(error.code)) {
        return a(`\n🔌 Connection error: Cannot reach GoatMart server.\nPlease check: ${GoatMart}`);
      }

      if (error.response?.data?.maintenanceMode) {
        return a(`\n🚧 ${error.response.data.title}\n💬 ${error.response.data.message}\n` +
          (error.response.data.estimatedTime ? `⏰ Estimated: ${error.response.data.estimatedTime}` : ""));
      }

      return a(`\n❌ Error: Unable to ${action}.\nStatus: ${error.response?.status || "Unknown"}\nMessage: ${error.response?.data?.error || error.message || "Unknown error"}`);
    };

    try {
      if (!args[0]) {
        return a(
          "\n📋 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀:\n\n" +
          `📦 ${event.body} show <ID>\n📄 ${event.body} page <number>\n🔍 ${event.body} search <query>\n📊 ${event.body} stats\n⬆️ ${event.body} upload <name>\n🔗 ${event.body} raw <ID>\n🎯 ${event.body} trending\n🔧 ${event.body} maintenance\n💡 Example: ${event.body} show 1`
        );
      }

      const c = args[0].toLowerCase();

      switch (c) {
        case "show": {
          const d = parseInt(args[1]);
          if (isNaN(d)) return a("\n⚠️ Please provide a valid item ID.");
          try {
            const e = await axios.get(`${GoatMart}/api/item/${d}`);
            const f = e.data;
            return a(`\n📦 Name: ${f.itemName}\n🆔 ID: ${f.itemID}\n⚙️ Type: ${f.type}\n📝 Desc: ${f.description}\n👨‍💻 Author: ${f.authorName}\n📅 Added: ${new Date(f.createdAt).toLocaleDateString()}\n👀 Views: ${f.views}\n💝 Likes: ${f.likes}\n📄 Raw: ${f.rawLink}\n🔗 View: ${GoatMart}/view?id=${f.itemID}`);
          } catch (err) {
            if (err.response?.status === 404) return a("\n❌ Command not found.");
            return b(err, "fetch command");
          }
        }

        case "get": 
        case "lookup": {
          const id = args[1];
          if (!id) return a("\n⚠️ Please provide a command ID (can be numeric or short ID).");
          try {
            const response = await axios.get(`${GoatMart}/api/lookup/${encodeURIComponent(id)}`);
            const f = response.data;
            return a(`\n📦 Name: ${f.itemName}\n🆔 ID: ${f.itemID} | 🔤 Short: ${f.shortId}\n📊 Sequential: ${f.sequentialId}\n⚙️ Type: ${f.type}\n📝 Desc: ${f.description}\n👨‍💻 Author: ${f.authorName}\n📅 Added: ${new Date(f.createdAt).toLocaleDateString()}\n👀 Views: ${f.views}\n💝 Likes: ${f.likes}\n📄 Raw: ${f.rawLink}\n🔗 View: ${GoatMart}/view?id=${f.itemID}`);
          } catch (err) {
            if (err.response?.status === 404) return a("\n❌ Command not found.");
            return b(err, "lookup command");
          }
        }

        case "page": {
          const g = parseInt(args[1]) || 1;
          if (g <= 0) return a("\n⚠️ Page number must be greater than 0.");

          try {
            const h = await axios.get(`${GoatMart}/api/items?page=${g}&limit=20`);
            const { items, total, totalPages } = h.data;

            if (g > totalPages && totalPages > 0) return a(`\n⚠️ Page ${g} doesn't exist. Total: ${totalPages}`);
            if (!items.length) return a("\n📭 No commands found.");

            const i = items.map((x, y) =>
              `${(g - 1) * 20 + y + 1}. 📦 ${x.itemName} (ID: ${x.itemID})\n 👀 ${x.views} | 💝 ${x.likes} | 👨‍💻 ${x.authorName}`
            ).join("\n\n");

            return a(`\n📄 Page ${g}/${totalPages} (${total} total)\n\n${i}\n\n💡 Use "${event.body} show <ID>"`);
          } catch (err) {
            return b(err, "browse commands");
          }
        }

        case "search": {
          const j = args.slice(1).join(" ");
          if (!j) return a("\n⚠️ Please provide a search query.");

          try {
            const k = await axios.get(`${GoatMart}/api/items?search=${encodeURIComponent(j)}&limit=8`);
   
