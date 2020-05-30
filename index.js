const io = require('socket.io-client'),
  request = require('request'),
  SteamTotp = require('steam-totp'),
  express = require('express'),
  SteamCommunity = require('steamcommunity'),
  steam = new SteamCommunity(),
  fs = require('fs'),
  TradeOfferManager = require('steam-tradeoffer-manager'),
  config = require('./config.json'),
  app = express();

// if steam deposit enabled
if(config.steam) {
  const manager = new TradeOfferManager({
    "domain": config.domain,
    "language": "en",
    "pollInterval": 30000,
    "cancelTime": 9 * 60 * 1000, // cancel outgoing offers after 9mins
  });
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
    console.log("Logged into Steam");
    manager.setCookies(cookies, function (err) {
      if (err) {
        console.log(err);
        return;
      }
    });
  });
}

// do not terminate the app
app.listen(config.port);

let mainUser = null;

const mainHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
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
let dodge = true;

function init() {
  const socket = io(
    `wss://csgoempire.com/?hash=${mainUser.user_hash}&user_id=${mainUser.id}`,
    { path: "/bot-manager" }
  );
  socket.on("connect", () => {
    console.log('Connected to empire.');
    setTimeout( () => {
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
        console.log(`${itemNames.join(', ')} item listed.`);
        break;
      case 'Confirming':
        confirmTrade(status.data.id).then(() => {
          if(config.discord) {
            sendDiscord(`<@${config.discordUserId}> Deposit offer for ${itemNames.join(', ')} are confirming.`);
          }
          console.log(`Deposit offer for ${itemNames.join(', ')} are confirming.`);
        }).catch(err => {
          // something went wrong
        });
        break;
      case 'Sending':
        // do not send duplicated offers
        if(offerSentFor.indexOf(status.data.id) === -1) {
          offerSentFor.push(status.data.id);
          if(config.steam) {
            sendSteamOffer(status.data.items, status.data.metadata.trade_url);
          }
          if(config.discord) {
            sendDiscord(`<@${config.discordUserId}> Deposit offer for ${itemNames.join(', ')} accepted, go send go go`);
          }
          console.log(`${itemNames.join(', ')} item confirmed.`);
        }
        break;
    }
  });
}
function sendSteamOffer(sendItems, tradeUrl) {
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
      steam.acceptConfirmationForObject(config.identitySecret, offer.id, status => {
        console.log('Deposit item sent & confirmed');
      })
    }
  });
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

function sendDiscord(msg) {
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