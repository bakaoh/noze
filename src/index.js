require("dotenv").config();
require("bluebird").config({ cancellation: true });
const storage = require("./storage");
const neon = require("./neon");

const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TELEGRAM_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN;
const bot = new TelegramBot(token, { polling: true });
const sendOpt = { parse_mode: "Html" };

const startMsg = `
Hello, my name is Noze, i will be your assistant in Neon. Please visit <a href="https://idlesplinter.xyz/">our website</a> for more infomation.

To get started, please use /help to get list of commands
`;

const helpMsg = `
You can control me by sending these commands:

/addToken [account_token] - add account by token
/add [email_or_username] [password] - add account by login info
/remove [account_name] - remove account from your list
/status - get list of your accounts and their status
`;

bot.onText(/\/start/, (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, startMsg, sendOpt);
});

bot.onText(/\/help/, (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, helpMsg, sendOpt);
});

bot.onText(/\/add (.+) (.+)/, async (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  const email_or_username = match[1].trim();
  const password = match[2].trim();
  const sid = await neon.login(email_or_username, password);
  if (!sid) {
    bot.sendMessage(chatId, "Invalid username or password", sendOpt);
    return;
  }
  const nprofile = await neon.getProfile(sid);
  if (nprofile.error) {
    bot.sendMessage(chatId, `Get profile error: ${nprofile.error}`, sendOpt);
    return;
  }
  const username = nprofile.username;
  const sprofile = await storage.getAccount(chatId, username);
  const isNew = sprofile.username != username;
  sprofile.chatId = chatId;
  sprofile.username = username;
  sprofile.sid = sid;
  sprofile.email_or_username = email_or_username;
  sprofile.password = password;
  sprofile.status = "Running";
  await storage.updateAccount(chatId, username, sprofile);
  const html = isNew
    ? `Added new account <b>${username}</b>!`
    : `Updated <b>${username}</b> login info!`;
  bot.sendMessage(chatId, html, sendOpt);
});

bot.onText(/\/remove (.+)/, async (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  const username = match[1].trim();
  const sprofile = await storage.getAccount(chatId, username);
  if (sprofile.username != username) {
    bot.sendMessage(chatId, `Account <b>${username}</b> not found`, sendOpt);
  } else {
    sprofile.status = "Removed";
    await storage.updateAccount(chatId, username, sprofile);
    bot.sendMessage(chatId, `Removed account <b>${username}</b>`, sendOpt);
  }
});

bot.onText(/\/addToken (.+)/, async (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  const sid = match[1].trim();
  const nprofile = await neon.getProfile(sid);
  if (nprofile.error) {
    bot.sendMessage(chatId, `Get profile error: ${nprofile.error}`, sendOpt);
    return;
  }
  const username = nprofile.username;
  const sprofile = await storage.getAccount(chatId, username);
  const isNew = sprofile.username != username;
  sprofile.chatId = chatId;
  sprofile.username = username;
  sprofile.sid = sid;
  sprofile.status = "Running";
  await storage.updateAccount(chatId, username, sprofile);
  const html = isNew
    ? `Added new account <b>${username}</b>!`
    : `Updated <b>${username}</b> token!`;
  bot.sendMessage(chatId, html, sendOpt);
});

bot.onText(/\/status/, async (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  const accounts = await storage.listAccountsByChatId(chatId);
  let html = "<pre>Name             | Status\n";
  for (let account of accounts) {
    html += `${account.username.padEnd(16)} | ${account.status}\n`;
  }
  html += `</pre>`;
  bot.sendMessage(chatId, html, sendOpt);
});

async function runAccount(account) {
  console.log("RunAccount", account.username);
  try {
    if (account.status != "Running") return;

    await neon.sleep(1000);
    const shifts = await neon.getShifts(account.sid);
    if (shifts.error && !shifts.is_logged_in) {
      console.log(account.username, "expired");
      if (account.email_or_username && account.password) {
        account.sid = await neon.login(
          account.email_or_username,
          account.password
        );
      } else {
        account.sid = "";
      }
      if (!account.sid) account.status = "Expired";
      await storage.updateAccount(account.chatId, account.username, account);
      if (!account.sid) {
        bot.sendMessage(
          account.chatId,
          `Account <b>${account.username}</b> token is expired`,
          sendOpt
        );
        return;
      }
    }

    // bank tips
    const unclaimed =
      shifts.neon_unclaimed + shifts.parts_unclaimed + shifts.juice_unclaimed;
    if (unclaimed > 0) {
      await neon.sleep(1000);
      const bankTips = await neon.bankTips(account.sid);
      console.log(account.username, "bank tips", bankTips);
      bot.sendMessage(
        account.chatId,
        `<b>${account.username}</b> claimed: ${shifts.neon_unclaimed} neon, ${shifts.juice_unclaimed} juice, ${shifts.parts_unclaimed} parts`,
        sendOpt
      );
    } else {
      console.log(account.username, "no bank tips");
    }

    // start shift
    if (!shifts.shifts[0].on_delivery) {
      await neon.sleep(1000);
      const startShift = await neon.startShift(account.sid, 1);
      console.log(account.username, "start shift", startShift);
      bot.sendMessage(
        account.chatId,
        `<b>${account.username}</b> started new shift`,
        sendOpt
      );
    } else {
      console.log(account.username, "on delivery");
    }
  } catch (err) {
    console.error("RunAccount", account.username, err);
  }
}

async function runAll() {
  console.log("RunAll");
  try {
    const accounts = await storage.listAccounts();
    for (let account of accounts) {
      await runAccount(account);
    }
  } catch (err) {
    console.error("RunAll", err);
  }
  setTimeout(runAll, 600000);
}

runAll();
