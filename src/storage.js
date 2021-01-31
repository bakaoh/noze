const level = require("level");
const db = level("db");

function updateAccount(chatId, username, data) {
  return new Promise((resolve, reject) => {
    let key = `acc:${chatId}:${username}`;
    db.put(key, JSON.stringify(data), err => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function getAccount(chatId, username) {
  return new Promise((resolve, reject) => {
    let key = `acc:${chatId}:${username}`;
    db.get(key, (err, value) => {
      if (err) {
        if (err.name == "NotFoundError") {
          return resolve({});
        } else return reject(err);
      } else resolve(JSON.parse(value));
    });
  });
}

function listAccounts() {
  return new Promise((resolve, reject) => {
    let accounts = [];
    db.createReadStream()
      .on("data", data => {
        accounts.push(JSON.parse(data.value));
      })
      .on("error", err => {
        reject(err);
      })
      .on("end", () => {
        resolve(accounts);
      });
  });
}

function listAccountsByChatId(chatId) {
  return new Promise((resolve, reject) => {
    let accounts = [];
    const prefix = `acc:${chatId}:`;
    const lt = `acc:${parseInt(chatId) + 1}:`;
    db.createReadStream({ gt: prefix, lt })
      .on("data", data => {
        if (data.key.startsWith(prefix)) {
          accounts.push(JSON.parse(data.value));
        }
      })
      .on("error", err => {
        reject(err);
      })
      .on("end", () => {
        resolve(accounts);
      });
  });
}

module.exports = {
  updateAccount,
  getAccount,
  listAccounts,
  listAccountsByChatId
};
