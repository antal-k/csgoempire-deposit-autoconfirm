const io = require('socket.io-client'),
  request = require('request'),
  SteamTotp = require('steam-totp'),
  express = require('express'),
  SteamCommunity = require('steamcommunity'),
  steam = new SteamCommunity(),
  fs = require('fs'),
  dateFormat = require('dateformat'),
  util = require('util'),
  TradeOfferManager = require('steam-tradeoffer-manager'),
  config = require('./config.json'),
  Push = require( 'pushover-notifications' );

let pushoverClient = undefined;
if(config.pushover) {
  pushoverClient = new Push({
    user: config.pushoverUser,
    token: config.pushoverToken,
  });
}

const colors = {
  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",
};
const log = console.log;

console.log = function (d, dc = false, color = '\x1b[0m') {
  log(color, "[" + dateFormat(new Date(), "yyyy-mm-dd H:MM:ss") + "] " + util.format(d));
};


let manager = new TradeOfferManager({
  "domain": config.domain,
  "language": "en",
  "pollInterval": 30000,
  "cancelTime": 9 * 60 * 1000, // cancel outgoing offers after 9mins
});

// do not terminate the app
setInterval(function() {
  // 
}, 1000 * 60 * 60);

let mainUser = null;

const mainHeaders = {
  'User-Agent': config.useragent,
  'Referer': 'https://csgoempire.com/withdraw',
  'Accept': '/',
  'Connection': 'keep-alive',
};

//Getting csgoempire meta
getUser().then(user => {
  if (user && user.id) {
    mainUser = user;
    init();
  }
}).catch(err => {
  // bad cookie probably or empire down
});

const offerSentFor = [];

// dodge the first few trade_status event to prevent the double item send if the offer is already at 'Sending' state
let dodge = false;

function init() {
  const socket = io(
    `wss://csgoempire.com/?hash=${mainUser.user_hash}&user_id=${mainUser.id}`,
    { path: "/bot-manager" }
  );
  socket.on("connect", () => {
    console.log('Connected to empire.');
    setTimeout(() => {
      dodge = false;
    }, 1000);
  });
  socket.on("trade_status", (status) => {
    if (status.type != "deposit" || dodge) {
      return;
    }

    const itemNames = [];
    status.data.items.forEach(item => {
      itemNames.push(item.market_name);
    })
    switch (status.data.status_text) {
      case 'Processing':
        // maybe we dont really need this
        // console.log(`${itemNames.join(', ')} item listed.`);
        break;
      case 'Confirming':
        confirmTrade(status.data.id).then(() => {
          if (config.discord) {
            sendMessage(`<@${config.discordUserId}> Deposit offer for ${itemNames.join(', ')} are confirming.`, config.discord, config.pushover);
          }
          console.log(`Deposit offer for ${itemNames.join(', ')} are confirming.`);
        }).catch(err => {
          // something went wrong
        });
        break;
      case 'Sending':
        // do not send duplicated offers
        if (offerSentFor.indexOf(status.data.id) === -1) {
          offerSentFor.push(status.data.id);
          console.log(`Tradelink: ${status.data.metadata.trade_url}`);
          console.log(`items: ${itemNames.join(', ')}`);
          if (config.steam) {
            sendSteamOffer(status.data.items, status.data.metadata.trade_url);
          }
          sendMessage(`<@${config.discordUserId}> Deposit offer for ${itemNames.join(', ')} accepted, go send go go`, config.discord, config.pushover);
          console.log(`${itemNames.join(', ')} item confirmed.`);
        }
        break;
    }
  });
}
function sendSteamOffer(sendItems, tradeUrl) {
  if (config.steam) {
    steamLogin().then(() => {
      const items = [];
      sendItems.forEach(item => {
        items.push({
          assetid: item.asset_id,
          appid: item.app_id,
          contextid: item.context_id,
        });
      });
      var offer = manager.createOffer(tradeUrl);
      offer.addMyItems(items);
      offer.send(function (err, status) {
        if (offer.id !== null) {
          setTimeout(() => {
            steam.acceptConfirmationForObject(config.identitySecret, offer.id, status => {
              console.log('Deposit item sent & confirmed');
            });
          }, 3000);
        }
      });
    });
  }
}
function confirmTrade(depositId) {
  return new Promise((resolve, reject) => {
    const options = {
      url: 'https://csgoempire.com/api/v2/p2p/afk-confirm',
      method: 'POST',
      json: {
        id: depositId,
      },
      headers: {
        Cookie: config.mainCookie,
        ...mainHeaders,
      },
    };

    request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        resolve(body);
      } else {
        reject(response);
      }
    });
  });
}

function getUser() {
  return new Promise((resolve, reject) => {
    const options = {
      url: 'https://csgoempire.com/api/v2/user',
      method: 'GET',
      json: true,
      headers: {
        Cookie: config.mainCookie,
        ...mainHeaders,
      },
    };

    request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        resolve(body);
      } else {
        reject(response);
      }
    });
  });
}

function sendMessage(msg, discord = false, pushover = false) {
  if(discord) {
    request({
      url: config.discordHook,
      method: 'POST',
      json: true,
      body: {
        content: msg,
      },
    }, (error, response, b) => {
      //
    });
  }
  if(pushover) {
    pushoverClient.send({
      message: msg,
      title: '[CSGOEMPIRE] Deposit',
      priority: 1,
    }, (err, result) => {
      if (err) {
        throw err;
      }
    });
  }
}

function steamLogin() {
  return new Promise((resolve, reject) => {
    const logOnOptions = {
      "accountName": config.accountName,
      "password": config.password,
      "twoFactorCode": SteamTotp.getAuthCode(config.sharedSecret)
    };
    if (fs.existsSync('steamguard.txt')) {
      logOnOptions.steamguard = fs.readFileSync('steamguard.txt').toString('utf8');
    }

    if (fs.existsSync('polldata.json')) {
      manager.pollData = JSON.parse(fs.readFileSync('polldata.json'));
    }

    steam.login(logOnOptions, function (err, sessionID, cookies, steamguard) {
      if (err) {
        console.log("Steam login fail: " + err.message);
      }
      fs.writeFile('steamguard.txt', steamguard, (err) => {
        if (err) throw err;
      });
      manager.setCookies(cookies, function (err) {
        if (err) {
          console.log(err);
          return;
        }
        resolve(true);
      });
    });
  });
}