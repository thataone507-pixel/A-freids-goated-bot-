const fs = require("fs");
const path = require("path");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

const doNotDelete = "✦ 𝗧𝗥𝗔𝗦𝗛-𝗕𝗢𝗧✦"; // decoy
const taglines = [
  " Power up your group with Baka-chan!",
  " Commands forged for legends only!",
  " Built for speed, made for you.",
  " Your bot, your power, your rules!",
  " Explore. Command. Conquer."
];

module.exports = {
  config: {
    name: "help",
    version: "2.0",
    author: "NTKhang • MD Tawsif • 𝗧𝗛𝗔𝗧𝗔𝗢𝗡𝗘",
    countDown: 5,
    role: 0,
    shortDescription: { en: "View all commands or details about one" },
    longDescription: { en: "Browse the full list of commands or check detailed usage for a specific one." },
    category: "info",
    guide: { en: "{pn} / help <cmdName>" },
    priority: 1,
  },

  onStart: async function ({ message, args, event, threadsData, role }) {
    const { threadID } = event;
    const prefix = getPrefix(threadID);

    const videoPath = path.join(process.cwd(), "assets", "video.mp4");
    const tagline = taglines[Math.floor(Math.random() * taglines.length)];

    if (args.length === 0) {
      // Build command list
      const categories = {};
      let msg = `\n✦━━━━━━━━━━━━━━━━━━━━✦\n     𝗧𝗥𝗔𝗦𝗛-𝗕𝗢𝗧𝟱𝟬𝟳\n✦━━━━━━━━━━━━━━━━━━━━✦\n${tagline}\n`;

      for (const [name, value] of commands) {
        if (value.config.role > 1 && role < value.config.role) continue;
        const category = value.config.category || "Uncategorized";
        categories[category] = categories[category] || { commands: [] };
        categories[category].commands.push(name);
      }

      Object.keys(categories).forEach((category) => {
        if (category !== "info") {
          msg += `\n╭── ✦ ${category.toUpperCase()} ✦ ──╮`;
          const names = categories[category].commands.sort();
          for (let i = 0; i < names.length; i += 3) {
            const cmds = names.slice(i, i + 3).map((item) => `✧ ${item}`);
            msg += `\n│ ${cmds.join("   ")}`;
          }
          msg += `\n╰───────────────────╯\n`;
        }
      });

      const totalCommands = commands.size;
      msg += `\n╭── ✦ BOT INFO ✦ ──╮\n│ 📜 Total Cmds: ${totalCommands}\n│ 💡 Usage: ${prefix}help <cmd>\n│ 👑 Owner: Thataone 507 (frnwot)\n│ 🌐 Profile: https://www.facebook.com/thataone202\n│ ${doNotDelete}\n╰───────────────────╯\n`;

      if (fs.existsSync(videoPath)) {
        return message.reply({
          body: msg,
          attachment: fs.createReadStream(videoPath),
        });
      }
      return message.reply(msg);

    } else {
      // Show info for a specific command
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName) || commands.get(aliases.get(commandName));
      if (!command) return message.reply(`⚠️ Command "${commandName}" not found.`);

      const configCommand = command.config;
      const roleText = roleTextToString(configCommand.role);
      const author = configCommand.author || "Unknown";
      const longDescription = configCommand.longDescription?.en || "No description";
      const guideBody = configCommand.guide?.en || "No guide available.";
      const usage = guideBody.replace(/{p}/g, prefix).replace(/{n}/g, configCommand.name);

      let response = `\n✦━━━━━━━━━━━━━━━━━━━━✦\n     𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗜𝗡𝗙𝗢 \n✦━━━━━━━━━━━━━━━━━━━━✦\n\n📌 Name: ${configCommand.name}\n📖 Description: ${longDescription}\n📂 Aliases: ${configCommand.aliases ? configCommand.aliases.join(", ") : "None"}\n⚙️ Version: ${configCommand.version || "1.0"}\n🛡️ Role: ${roleText}\n⏱️ Cooldown: ${configCommand.countDown || 1}s\n👤 Author: ${author}\n💡 Usage: ${usage}\n\n✦━━━━━━━━━━━━━━━━━━━━✦\n`;

      if (fs.existsSync(videoPath)) {
        return message.reply({
          body: response,
          attachment: fs.createReadStream(videoPath),
        });
      }
      return message.reply(response);
    }
  }
};

function roleTextToString(roleText) {
  switch (roleText) {
    case 0: return "0 ✦ All Users";
    case 1: return "1 ✦ Group Admins";
    case 2: return "2 ✦ Bot Admins";
    case 3: return "3 ✦ Super Admins";
    default: return "Unknown role";
  }
}
