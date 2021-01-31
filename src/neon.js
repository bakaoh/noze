const axios = require("axios");

const createHeaders = sid => ({
  Accept: "application/json, text/plain, */*",
  "Accept-Encoding": "gzip",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.87 Safari/537.36",
  Cookie: `connect.sid=${sid}; _ga=GA1.2.1943626512.1611540461; _gid=GA1.2.44699246.1611907449`,
  Referer: "https://portal.neondistrict.io/"
});

const post = (url, sid, data) => {
  const headers = createHeaders(sid);
  return axios
    .post("https://portal.neondistrict.io" + url, data, { headers })
    .then(res => res.data.data);
};

const login = (
  email_or_username,
  password,
  code_2fa = "",
  remember_me = false
) =>
  axios
    .post(
      "https://portal.neondistrict.io/api/account/login",
      { code_2fa, email_or_username, password, remember_me },
      { headers: createHeaders("") }
    )
    .then(res => {
      if (res.data.error) return "";
      return res.headers["set-cookie"][0].split("=")[1].split(";")[0];
    });

const getProfile = sid => post("/api/user/getProfile", sid);
const getShifts = sid => post("/api/neonpizza/getShifts", sid);
const getShiftDetails = sid => post("/api/neonpizza/getShiftDetails", sid);
const bankTips = sid => post("/api/neonpizza/bankTips", sid);
const startShift = (sid, tier) =>
  post("/api/neonpizza/startShift", sid, { tier });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  post,
  login,
  getProfile,
  getShifts,
  getShiftDetails,
  bankTips,
  startShift,
  sleep
};
