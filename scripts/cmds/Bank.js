/cmd install bank.js const fs = require("fs");
const path = require("path");
const { createCanvas, registerFont } = require("canvas");

const BANK_FILE = path.join(__dirname, "bank.json");

module.exports = {
  config: {
    name: "bank",
    description: "Deposit or withdraw money from the bank and earn interest",
    guide: {
      vi: "",
      en: "Bank:\nInterest - Balance - Withdraw - Deposit - Transfer - Richest - Loan - Payloan - Lottery - Gamble - HighRiskInvest[hrinvest] - Heist"
    },
    category: "game",
    countDown: 1,
    role: 0,
    author: "ʚʆɞ Sømå Sønïč ʚʆɞ "
  },
  onStart: async function({ args, message, event, api, usersData }) {
    const { getPrefix } = global.utils;
    const p = getPrefix(event.threadID);

    if (!fs.existsSync(BANK_FILE)) {
      fs.writeFileSync(BANK_FILE, JSON.stringify({}, null, 2));
    }
    let bankData = {};
    try {
      bankData = JSON.parse(fs.readFileSync(BANK_FILE, "utf8"));
    } catch (e) {
      bankData = {};
      fs.writeFileSync(BANK_FILE, JSON.stringify(bankData, null, 2));
    }

    function saveBank() {
      try {
        fs.writeFileSync(BANK_FILE, JSON.stringify(bankData, null, 2));
      } catch (e) {
        console.error("Failed saving bank.json:", e);
      }
    }

    function ensureAccount(id) {
      if (!bankData[id]) {
        bankData[id] = {
          bank: 0,
          wallet: 0,
          lastInterestClaimed: Date.now(),
          password: null,
          passwordAttempts: 0,
          lockedUntil: 0,
          loan: 0,
          loanPayed: true,
          role: null,
          achievements: [],
          history: [],
          karma: 0,
          insured: false,
          vault: 0,
          prisonUntil: 0,
          failedHeists: 0,
          lotteryTickets: [],
          bonds: [],
          dailyClaim: 0
        };
        saveBank();
      }
    }

    function addHistory(id, text) {
      ensureAccount(id);
      const entry = { text, date: new Date().toISOString() };
      bankData[id].history.unshift(entry);
      if (bankData[id].history.length > 50) bankData[id].history.pop();
      saveBank();
    }

    function giveAchievement(id, name) {
      ensureAccount(id);
      if (!bankData[id].achievements.includes(name)) {
        bankData[id].achievements.push(name);
        addHistory(id, `🏅 Achievement unlocked: ${name}`);
        try {
          api.sendMessage(`🏆 Achievement unlocked: ${name}`, id);
        } catch (e) {}
      }
    }

    async function createInfoImage(text) {
      const canvas = createCanvas(800, 600);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, 800, 600);

      ctx.fillStyle = "#16213e";
      ctx.fillRect(20, 20, 760, 560);

      ctx.strokeStyle = "#0f3460";
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, 760, 560);

      ctx.fillStyle = "#e94560";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🏦 UCHIWA BANK 🏦", 400, 70);

      ctx.fillStyle = "#ffffff";
      ctx.font = "20px Arial";
      ctx.textAlign = "left";

      const lines = text.split("\n");
      let y = 120;
      lines.forEach(line => {
        if (line.trim()) {
          ctx.fillText(line, 50, y);
          y += 35;
        }
      });

      const buffer = canvas.toBuffer("image/png");
      const imgPath = path.join(__dirname, `bank_info_${Date.now()}.png`);
      fs.writeFileSync(imgPath, buffer);
      return imgPath;
    }

    const rawUserMoney = await usersData.get(event.senderID, "money");
    const userMoney = typeof rawUserMoney === "number" ? rawUserMoney : 0;
    const user = String(event.senderID);
    let username = "Unknown";
    try {
      const info = await api.getUserInfo(user);
      username = info[user].name;
    } catch (e) {}

    ensureAccount(user);

    const command = args[0]?.toLowerCase();
    const amount = parseInt(args[1]);
    const recipientUID = parseInt(args[2]);

    const now = Date.now();
    if (bankData[user].prisonUntil && bankData[user].prisonUntil > now) {
      const allowedWhilePrison = ["show", "balance", "help", "history"];
      if (command && !allowedWhilePrison.includes(command)) {
        return message.reply(
          `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You are in prison until ${new Date(bankData[user].prisonUntil).toLocaleString()}. You cannot use this command.🔒`
        );
      }
    }

    switch (command) {
      case "deposit": {
        const depositPassword = args[1];
        const depositAmount = parseInt(args[2]);

        if (!depositPassword || !depositAmount) {
          const infoText = `Deposit Command\n\nPassword and amount required\n\nExample:\n${p}bank deposit (password) (amount)\n\nSet password with:\n${p}bank setpassword (password)`;
          const imgPath = await createInfoImage(infoText);
          return message.reply({ attachment: fs.createReadStream(imgPath) });
        }

        if (bankData[user].password !== depositPassword) {
          bankData[user].passwordAttempts = (bankData[user].passwordAttempts || 0) + 1;
          if (bankData[user].passwordAttempts >= 3) {
            bankData[user].lockedUntil = Date.now() + 1000 * 60 * 5;
            saveBank();
            return message.reply(
              "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect password. Your account is temporarily locked for 5 minutes due to multiple failed attempts.🔐"
            );
          }
          saveBank();
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect password. Please try again.🔑"
          );
        }
        bankData[user].passwordAttempts = 0;

        if (isNaN(depositAmount) || depositAmount <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid deposit amount.💸"
          );
        }

        if (userMoney < depositAmount) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You don't have the required amount✖"
          );
        }

        bankData[user].bank += depositAmount;
        await usersData.set(event.senderID, {
          money: userMoney - depositAmount
        });
        addHistory(user, `🏦 Deposit ${depositAmount}$`);
        saveBank();

        if (bankData[user].bank >= 1000000) giveAchievement(user, "Millionaire");
        try {
          api.sendMessage(
            `✅ Deposit successful: +${depositAmount}$ added to your bank.`,
            user
          );
        } catch (e) {}

        const infoText = `Deposit Successful\n\nAmount: ${depositAmount}$\nNew Balance: ${bankData[user].bank}$\n\nTransaction completed successfully`;
        const imgPath = await createInfoImage(infoText);
        return message.reply({ attachment: fs.createReadStream(imgPath) });
      }

      case "withdraw": {
        const withdrawPassword = args[1];
        const withdrawAmount = parseInt(args[2]);

        if (!withdrawPassword || !withdrawAmount) {
          const infoText = `Withdraw Command\n\nPassword and amount required\n\nExample:\n${p}bank withdraw (password) (amount)\n\nSet password with:\n${p}bank setpassword (password)`;
          const imgPath = await createInfoImage(infoText);
          return message.reply({ attachment: fs.createReadStream(imgPath) });
        }

        if (bankData[user].password !== withdrawPassword) {
          bankData[user].passwordAttempts = (bankData[user].passwordAttempts || 0) + 1;
          if (bankData[user].passwordAttempts >= 3) {
            bankData[user].lockedUntil = Date.now() + 1000 * 60 * 5;
            saveBank();
            return message.reply(
              "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect password. Your account is temporarily locked for 5 minutes due to multiple failed attempts.🔐"
            );
          }
          saveBank();
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect password. Please try again.🔑"
          );
        }
        bankData[user].passwordAttempts = 0;

        const balance = bankData[user].bank || 0;

        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid withdrawal amount.💸"
          );
        }

        if (withdrawAmount > balance) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧The requested amount is greater than the available balance in your bank account.👽"
          );
        }

        bankData[user].bank = balance - withdrawAmount;
        await usersData.set(event.senderID, {
          money: userMoney + withdrawAmount
        });
        addHistory(user, `🏧 Withdraw ${withdrawAmount}$`);
        saveBank();

        try {
          api.sendMessage(
            `✅ Withdrawal successful: ${withdrawAmount}$ has been sent to your wallet.`,
            user
          );
        } catch (e) {}

        const infoText = `Withdrawal Successful\n\nAmount: ${withdrawAmount}$\nRemaining Balance: ${bankData[user].bank}$\n\nTransaction completed successfully`;
        const imgPath = await createInfoImage(infoText);
        return message.reply({ attachment: fs.createReadStream(imgPath) });
      }

      case "show":
      case "balance": {
        const bankBalance = bankData[user].bank || 0;
        const infoText = `Account Balance\n\nName: ${username}\nBank Balance: ${bankBalance}$\nWallet: ${userMoney}$\nVault: ${bankData[user].vault || 0}$\nLoan: ${bankData[user].loan || 0}$\n\nRank: ${bankData[user].role || "Member"}`;
        const imgPath = await createInfoImage(infoText);
        return message.reply({ attachment: fs.createReadStream(imgPath) });
      }

      case "stats": {
        if (args[1] && args[1].toLowerCase() === "global") {
          if (bankData[user].role !== "VIP") return message.reply("Only VIP can view global stats.");
          const all = Object.values(bankData);
          const totalPlayers = all.length;
          const totalMoney = all.reduce((s, a) => s + (a.bank || 0), 0);
          const infoText = `Global Bank Statistics\n\nTotal Players: ${totalPlayers}\nTotal Money in Bank: ${totalMoney}$\n\nSystem operational`;
          const imgPath = await createInfoImage(infoText);
          return message.reply({ attachment: fs.createReadStream(imgPath) });
        } else {
          const d = bankData[user];
          const infoText = `Account Statistics\n\nName: ${username}\nWallet: ${userMoney}$\nBank: ${d.bank || 0}$\nVault: ${d.vault || 0}$\nLoan: ${d.loan || 0}$\nRank: ${d.role || "Member"}\nKarma: ${d.karma || 0}\n\nAchievements: ${(d.achievements || []).length}`;
          const imgPath = await createInfoImage(infoText);
          return message.reply({ attachment: fs.createReadStream(imgPath) });
        }
      }

      case "hrinvest": {
        const investmentAmount = parseInt(args[1]);

        if (isNaN(investmentAmount) || investmentAmount <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid investment amount.💸"
          );
        }

        if (bankData[user].bank < investmentAmount) {
          return message.reply("✧You don't have enough in bank to invest.");
        }

        const riskOutcome = Math.random() < 0.7;
        const potentialReturns = investmentAmount * (riskOutcome ? 2 : 0.2);

        if (riskOutcome) {
          bankData[user].bank -= investmentAmount;
          addHistory(user, `📉 HighRiskInvest LOST ${investmentAmount}$`);
          bankData[user].karma = Math.max(0, (bankData[user].karma || 0) - 1);
          bankData[user].failedHeists = (bankData[user].failedHeists || 0) + 1;
          saveBank();
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Your high-risk investment of ${investmentAmount}$ was risky, and you lost your money. 😔`
          );
        } else {
          bankData[user].bank += potentialReturns;
          addHistory(user, `📈 HighRiskInvest WIN ${potentialReturns}$`);
          bankData[user].karma = (bankData[user].karma || 0) + 2;
          saveBank();
          giveAchievement(user, "Lucky Investor");
          try {
            api.sendMessage(
              `🎉 Your high-risk investment paid off: +${potentialReturns}$!`,
              user
            );
          } catch (e) {}
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Congratulations! Your high-risk investment of ${investmentAmount}$ paid off, and you earned ${potentialReturns}$ in returns! 🎉`
          );
        }
      }

      case "gamble": {
        if (bankData[user].bank >= 100000000000 && bankData[user].role !== "VIP") {
          bankData[user].role = "VIP";
          saveBank();
          try {
            api.sendMessage(
              "🎉 Congratulations! You've been added to the VIP list because your bank balance reached 100,000,000,000$! You can now access the 'gamble' feature. 👑",
              user
            );
          } catch (e) {}
        }

        if (bankData[user].role !== "VIP") {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Only VIP users can access the 'gamble' feature.\n✧ Reach a bank balance of 100,000,000,000$ to unlock VIP status. 👑"
          );
        }

        const betAmount = parseInt(args[1]);

        if (isNaN(betAmount) || betAmount <= 0) {
          return message.reply(
            "==[🏦 𝐓𝐡𝐚𝐭𝐚𝐨𝐧𝐞 𝐛𝐚𝐧𝐤 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Please enter a valid amount to bet.💸"
          );
        }

        if (userMoney < betAmount) {
          return message.reply(
            "==[🏦 𝐓𝐡𝐚𝐭𝐚𝐨𝐧𝐞 𝐛𝐚𝐧𝐤 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You don't have enough money to place that bet. 🙅‍♂"
          );
        }

        const winChance = Math.random() < 0.5;
        if (winChance) {
          const winnings = betAmount * 2;
          bankData[user].bank += winnings;
          await usersData.set(event.senderID, {
            money: userMoney - betAmount + winnings
          });
          addHistory(user, `🎲 Gamble WIN ${winnings}$`);
          saveBank();
          giveAchievement(user, "Gambler");
          return message.reply(
            `==[🏦 𝐓𝐡𝐚𝐭𝐚𝐨𝐧𝐞 𝐛𝐚𝐧𝐤🏦]==\n━━━━━━━━━━━━━━━━\n✧ Congratulations! You've won ${winnings}$! 🎉`
          );
        } else {
          bankData[user].bank -= betAmount;
          await usersData.set(event.senderID, {
            money: userMoney - betAmount
          });
          addHistory(user, `🎲 Gamble LOSE ${betAmount}$`);
          bankData[user].karma = Math.max(0, (bankData[user].karma || 0) - 1);
          saveBank();
          return message.reply(
            `==[🏦 𝐓𝐡𝐚𝐭𝐚𝐨𝐧𝐞 𝐛𝐚𝐧𝐤 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Oh no! You've lost ${betAmount}$ in the gamble. 😢`
          );
        }
      }

      case "heist": {
        const heistSuccessChance = 0.2;
        const heistWinAmount = 1000;
        const heistLossAmount = 500;

        if (bankData[user].failedHeists >= 5) {
          return message.reply(
            "==[🏦 𝐓𝐡𝐚𝐭𝐚𝐨𝐧𝐞 𝐁𝐚𝐧𝐤 🏦]==\n━━━━━━━━━━━━━━━━\n✧Your account is flagged for too many failed heists. Heist is temporarily disabled for you.🚫"
          );
        }

        const isSuccess = Math.random() < heistSuccessChance;

        if (isSuccess) {
          const winnings = heistWinAmount;
          bankData[user].bank += winnings;
          bankData[user].failedHeists = 0;
          addHistory(user, `💥 Heist SUCCESS +${winnings}$`);
          saveBank();
          giveAchievement(user, "Heist Master");
          try {
            api.sendMessage(`💰 Bank heist successful! You've won ${winnings}$!`, user);
          } catch (e) {}
          return message.reply(
            `==[🏦 𝐭𝐡𝐚𝐭𝐚𝐨𝐧𝐞 𝐛𝐚𝐧𝐤 🏦]==\n━━━━━━━━━━━━━━━━\n✧Bank heist successful! You've won ${winnings}$! 💰`
          );
        } else {
          const lossAmount = heistLossAmount;
          bankData[user].bank -= lossAmount;
          bankData[user].failedHeists = (bankData[user].failedHeists || 0) + 1;
          if (bankData[user].failedHeists >= 3) {
            bankData[user].prisonUntil = Date.now() + 1000 * 60 * 60;
            addHistory(user, `🚨 Heist failed multiple times — Prison 1 hour`);
            try {
              api.sendMessage(
                `🚔 You were caught after multiple failed heists. Prison for 1 hour.`,
                user
              );
            } catch (e) {}
          } else {
            addHistory(user, `❌ Heist fail -${lossAmount}$`);
          }
          saveBank();
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Bank heist failed! You've lost ${lossAmount}$! 😔`
          );
        }
      }

      case "interest": {
        const interestRate = 0.001;
        const lastInterestClaimed = bankData[user].lastInterestClaimed || Date.now();
        const currentTime = Date.now();
        const timeDiffInSeconds = (currentTime - lastInterestClaimed) / 1000;
        let rate = interestRate;
        if (bankData[user].role === "VIP") rate = interestRate * 3;
        const interestEarned = bankData[user].bank * (rate / 970) * timeDiffInSeconds;

        if (bankData[user].bank <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You don't have any money in your bank account to earn interest.💸🤠"
          );
        }

        bankData[user].lastInterestClaimed = currentTime;
        bankData[user].bank += interestEarned;
        addHistory(user, `💹 Interest +${interestEarned.toFixed(2)}$`);
        saveBank();

        if (bankData[user].role === "VIP") giveAchievement(user, "VIP Investor");

        const infoText = `Interest Earned\n\nAmount: ${interestEarned.toFixed(2)}$\nNew Balance: ${bankData[user].bank.toFixed(2)}$\n\nAdded to your account`;
        const imgPath = await createInfoImage(infoText);
        return message.reply({ attachment: fs.createReadStream(imgPath) });
      }

      case "transfer": {
        const senderBalance = bankData[user]?.bank || 0;
        if (isNaN(amount) || amount <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Please enter a valid amount greater than 0 for the transfer. ♻"
          );
        }
        if (senderBalance < amount) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Insufficient funds in your bank account to complete this transfer. ✖"
          );
        }
        if (isNaN(recipientUID) || recipientUID <= 0) {
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Please provide a valid recipient ID (UID).\nExample:\n${p}bank transfer 5000 123456789`
          );
        }
        if (String(recipientUID) === user) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You cannot transfer money to yourself. 🔄"
          );
        }
        ensureAccount(String(recipientUID));
        bankData[user].bank -= amount;
        bankData[String(recipientUID)].bank += amount;
        addHistory(user, `➡️ Transfer ${amount}$ to ${recipientUID}`);
        addHistory(String(recipientUID), `⬅️ Received ${amount}$ from ${user}`);
        saveBank();

        let recipientName = "Unknown User";
        try {
          const recipientInfo = await api.getUserInfo(String(recipientUID));
          recipientName = recipientInfo[String(recipientUID)]?.name || "Unknown User";
        } catch (error) {}

        const infoText = `Transfer Successful\n\nAmount: ${amount}$\nTo: ${recipientName}\nID: ${recipientUID}\n\nYour Balance: ${bankData[user].bank}$`;
        const imgPath = await createInfoImage(infoText);

        try {
          await api.sendMessage(`You received ${amount}$ from ${username}`, String(recipientUID));
        } catch (e) {}

        return message.reply({ attachment: fs.createReadStream(imgPath) });
      }

      case "top": {
        const bankDataCp = JSON.parse(fs.readFileSync(BANK_FILE, "utf8"));

        const topUsers = Object.entries(bankDataCp)
          .sort(([, a], [, b]) => (b.bank || 0) - (a.bank || 0))
          .slice(0, 25);

        const output = (
          await Promise.all(
            topUsers.map(async ([userID, userData], index) => {
              const userName = await usersData.getName(userID);
              return `[${index + 1}. ${userName}] • ${userData.bank || 0}$`;
            })
          )
        ).join("\n");

        return message.reply("𝐑𝐢𝐜𝐡𝐞𝐬𝐭 𝐩𝐞𝐨𝐩𝐥𝐞 𝐢𝐧 𝐭𝐡𝐞 thataone system👑🤴:\n" + output);
      }

      case "setpassword": {
        const newPassword = args[1];
        if (!newPassword) {
          const infoText = `Set Password\n\nExample:\n${p}bank setpassword mySecret123\n\nUse a strong password to secure your bank actions (deposit/withdraw).`;
          const imgPath = await createInfoImage(infoText);
          return message.reply({ attachment: fs.createReadStream(imgPath) });
        }
        if (bankData[user].lockedUntil && bankData[user].lockedUntil > Date.now()) {
          return message.reply("Your account is temporarily locked. Wait before changing password.");
        }
        bankData[user].password = String(newPassword);
        bankData[user].passwordAttempts = 0;
        saveBank();
        addHistory(user, `🔐 Password set/changed`);
        try {
          api.sendMessage("✅ Password set successfully.", user);
        } catch (e) {}
        return message.reply("✅ Your bank password has been set.");
      }

      case "loan": {
        const loanAmount = parseInt(args[1]);
        if (isNaN(loanAmount) || loanAmount <= 0) {
          const infoText = `Loan Command\n\nExample:\n${p}bank loan 5000\n\nYou can request a loan if you have no unpaid loan. Interest will apply.`;
          const imgPath = await createInfoImage(infoText);
          return message.reply({ attachment: fs.createReadStream(imgPath) });
        }
        if (!bankData[user].loanPayed) {
          return message.reply("You already have an unpaid loan. Pay it before requesting a new one.");
        }
        const maxLoan = Math.max(1000, Math.floor((bankData[user].bank || 0) * 2));
        if (loanAmount > maxLoan) {
          return message.reply(`You can request up to ${maxLoan}$.`);
        }
        bankData[user].loan = loanAmount;
        bankData[user].loanPayed = false;
        bankData[user].bank += loanAmount;
        addHistory(user, `💸 Loan taken ${loanAmount}$`);
        saveBank();
        try {
          api.sendMessage(`Loan approved: ${loanAmount}$. Pay it back with ${p}bank payloan (amount)`, user);
        } catch (e) {}
        return message.reply(`✅ Loan approved: ${loanAmount}$. It has been added to your bank.`);
      }

      case "payloan": {
        const payAmount = parseInt(args[1]);
        if (isNaN(payAmount) || payAmount <= 0) {
          const infoText = `Payloan Command\n\nExample:\n${p}bank payloan 2000\n\nUse this to repay your loan from your bank balance.`;
          const imgPath = await createInfoImage(infoText);
          return message.reply({ attachment: fs.createReadStream(imgPath) });
        }
        if (bankData[user].loanPayed || (bankData[user].loan || 0) <= 0) {
          return message.reply("You have no outstanding loan to pay.");
        }
        const balance = bankData[user].bank || 0;
        if (payAmount > balance) {
          return message.reply("You don't have enough in your bank to pay that amount.");
        }
        const interest = Math.ceil((bankData[user].loan || 0) * 0.05);
        const remainingLoan = Math.max(0, (bankData[user].loan || 0) - payAmount);
        bankData[user].bank -= payAmount;
        bankData[user].loan = remainingLoan;
        if (remainingLoan === 0) {
          bankData[user].loanPayed = true;
          addHistory(user, `✅ Loan fully repaid`);
          giveAchievement(user, "Debt Free");
        } else {
          addHistory(user, `🧾 Loan partial payment ${payAmount}$ - remaining ${remainingLoan}$`);
        }
        bankData[user].bank = Math.max(0, bankData[user].bank - interest);
        saveBank();
        try {
          api.sendMessage(`Payment received. Remaining loan: ${bankData[user].loan}$`, user);
        } catch (e) {}
        return message.reply(`✅ Loan payment processed. Interest ${interest}$ applied. Remaining loan: ${bankData[user].loan}$.`);
      }

      case "lottery": {
        const sub = args[1]?.toLowerCase();
        if (!sub || sub === "help") {
          const infoText = `Lottery System\n\nBuy ticket:\n${p}bank lottery buy (number 1-999) (amount)\n\nView your tickets:\n${p}bank lottery my\n\nDraw is automatic randomly by system night reset.`;
          const imgPath = await createInfoImage(infoText);
          return message.reply({ attachment: fs.createReadStream(imgPath) });
        }
        if (sub === "buy") {
          const pick = parseInt(args[2]);
          const price = parseInt(args[3]);
          if (isNaN(pick) || pick < 1 || pick > 999) {
            return message.reply("Choose a number between 1 and 999.");
          }
          if (isNaN(price) || price <= 0) {
            return message.reply("Enter a valid ticket price.");
          }
          if (bankData[user].bank < price) {
            return message.reply("You don't have enough in bank to buy that ticket.");
          }
          bankData[user].bank -= price;
          bankData[user].lotteryTickets = bankData[user].lotteryTickets || [];
          bankData[user].lotteryTickets.push({ number: pick, price, date: new Date().toISOString() });
          addHistory(user, `🎟️ Bought lottery ticket #${pick} for ${price}$`);
          saveBank();
          return message.reply(`🎟️ Ticket purchased: #${pick} for ${price}$. Good luck!`);
        }
        if (sub === "my") {
          const tickets = bankData[user].lotteryTickets || [];
          if (!tickets.length) return message.reply("You have no lottery tickets.");
          const list = tickets.map(t => `#${t.number} • ${t.price}$ • ${new Date(t.date).toLocaleString()}`).join("\n");
          const infoText = `Your Lottery Tickets\n\n${list}`;
          const imgPath = await createInfoImage(infoText);
          return message.reply({ attachment: fs.createReadStream(imgPath) });
        }
        return message.reply("Unknown lottery command. Use help for available options.");
      }

      case "history": {
        const hist = bankData[user].history || [];
        if (!hist.length) return message.reply("No history available for your account.");
        const lines = hist.slice(0, 15).map(h => `${new Date(h.date).toLocaleString()} • ${h.text}`).join("\n");
        const infoText = `Transaction History\n\n${lines}`;
        const imgPath = await createInfoImage(infoText);
        return message.reply({ attachment: fs.createReadStream(imgPath) });
      }

      case "vault": {
        const sub = args[1]?.toLowerCase();
        if (!sub || sub === "help") {
          const infoText = `Vault Commands\n\nDeposit to vault:\n${p}bank vault deposit (amount)\n\nWithdraw from vault:\n${p}bank vault withdraw (amount)\n\nVault is secure storage separate from bank.`;
          const imgPath = await createInfoImage(infoText);
          return message.reply({ attachment: fs.createReadStream(imgPath) });
        }
        if (sub === "deposit") {
          const vAmount = parseInt(args[2]);
          if (isNaN(vAmount) || vAmount <= 0) return message.reply("Enter a valid amount.");
          if (bankData[user].bank < vAmount) return message.reply("Not enough bank balance.");
          bankData[user].bank -= vAmount;
          bankData[user].vault = (bankData[user].vault || 0) + vAmount;
          addHistory(user, `🔒 Vault deposit ${vAmount}$`);
          saveBank();
          return message.reply(`🔒 ${vAmount}$ moved to your vault.`);
        }
        if (sub === "withdraw") {
          const vAmount = parseInt(args[2]);
          if (isNaN(vAmount) || vAmount <= 0) return message.reply("Enter a valid amount.");
          if ((bankData[user].vault || 0) < vAmount) return message.reply("Not enough in vault.");
          bankData[user].vault -= vAmount;
          bankData[user].bank += vAmount;
          addHistory(user, `🔓 Vault withdraw ${vAmount}$`);
          saveBank();
          return message.reply(`🔓 ${vAmount}$ withdrawn from your vault to bank.`);
        }
        return message.reply("Unknown vault command. Use help for more info.");
      }

      case "help": {
        const infoText = `Thataone bank- COMMANDS\n\n${p}bank balance / show\n${p}bank deposit (password) (amount)\n${p}bank withdraw (password) (amount)\n${p}bank transfer (amount) (uid)\n${p}bank setpassword (password)\n${p}bank loan (amount)\n${p}bank payloan (amount)\n${p}bank lottery buy (number) (price)\n${p}bank lottery my\n${p}bank hrinvest (amount)\n${p}bank gamble (amount) [VIP]\n${p}bank heist\n${p}bank interest\n${p}bank history\n${p}bank vault deposit/withdraw (amount)`;
        const imgPath = await createInfoImage(infoText);
        return message.reply({ attachment: fs.createReadStream(imgPath) });
      }

      default: {
        const infoText = `Thataone bank\n\nType ${p}bank help to see available commands.\nType ${p}bank show to view your balance.`;
        const imgPath = await createInfoImage(infoText);
        return message.reply({ attachment: fs.createReadStream(imgPath) });
      }
    }
  }
};
