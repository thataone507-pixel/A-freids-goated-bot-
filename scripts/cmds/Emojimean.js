const axios = require("axios");
const cheerio = require("cheerio");

const langsSupported = [
  "sq","ar","az","bn","bs","bg","my","zh-hans","zh-hant","hr","cs","da","nl","en",
  "et","fil","fi","fr","ka","de","el","he","hi","hu","id","it","ja","kk","ko",
  "lv","lt","ms","nb","fa","pl","pt","ro","ru","sr","sk","sl","es","sv","th",
  "tr","uk","vi"
];

module.exports = {
  config: {
    name: "emojimean",
    aliases: ["em", "emojimeaning"],
    version: "1.4-fixed",
    author: "thataone",
    countDown: 5,
    role: 0,
    category: "wiki",
    description: {
      en: "Find the meaning of an emoji"
    },
    guide: {
      en: "{pn} <emoji>"
    }
  },

  langs: {
    en: {
      missingEmoji: "⚠️ Please enter an emoji.",
      manyRequest: "⚠️ Too many requests, try again later.",
      notHave: "Not available",
      fail: "❌ Could not get emoji meaning.",
      meaningOfEmoji:
        "📌 Meaning of %1\n\n📄 First meaning:\n%2\n\n📑 More meaning:\n%3\n\n📄 Shortcode: %4\n\n©️ Source: %5",
      meaningOfWikipedia:
        "\n\n📝 React to this message to view Wikipedia meaning",
      meanOfWikipedia:
        "📑 Wikipedia meaning of \"%1\":\n%2"
    }
  },

  onStart: async function ({ args, message, event, threadsData, getLang, commandName }) {
    const emoji = args[0];
    if (!emoji) return message.reply(getLang("missingEmoji"));

    const threadData = await threadsData.get(event.threadID);
    let lang = threadData?.data?.lang || global.GoatBot.config.language;
    if (!langsSupported.includes(lang)) lang = "en";

    let data;
    try {
      data = await getEmojiMeaning(emoji, lang);
    } catch (e) {
      return message.reply(getLang("fail"));
    }

    if (!data)
      return message.reply(getLang("fail"));

    const {
      meaning,
      moreMeaning,
      wikiText,
      meaningOfWikipedia,
      shortcode,
      source
    } = data;

    return message.reply(
      getLang(
        "meaningOfEmoji",
        emoji,
        meaning || getLang("notHave"),
        moreMeaning || getLang("notHave"),
        shortcode || getLang("notHave"),
        source
      ) + (wikiText ? getLang("meaningOfWikipedia") : ""),
      (err, info) => {
        if (!err && wikiText) {
          global.GoatBot.onReaction.set(info.messageID, {
            commandName,
            author: event.senderID,
            emoji,
            meaningOfWikipedia
          });
        }
      }
    );
  },

  onReaction: async ({ event, Reaction, message, getLang }) => {
    if (Reaction.author !== event.userID) return;
    return message.reply(
      getLang("meanOfWikipedia", Reaction.emoji, Reaction.meaningOfWikipedia)
    );
  }
};

async function getEmojiMeaning(emoji, lang) {
  const url = `https://www.emojiall.com/${lang}/emoji/${encodeURI(emoji)}`;
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const meanings = $(".emoji_card_content.px-4.py-3");
  const meaning = meanings.eq(0).text().trim();
  const moreMeaning = meanings.eq(1).text().trim();

  const wikiBlock = $(".emoji_card_content.pointer").text().trim();
  const wikiText = wikiBlock.includes(emoji) ? wikiBlock : null;

  const wikiMeaning = $(".emoji_card_content.border_top.small").text().trim();

  const shortcodeMatch = $("table tr")
    .text()
    .match(/(:.*?:)/);

  if (!meaning && !moreMeaning) return null;

  return {
    meaning,
    moreMeaning,
    wikiText,
    meaningOfWikipedia: wikiMeaning || null,
    shortcode: shortcodeMatch?.[1] || null,
    source: url
  };
}
