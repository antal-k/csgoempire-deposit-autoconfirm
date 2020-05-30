# USE THIS CODE AT YOUR OWN RISK, I DON'T TAKE RESPONSIBILITY FOR STEAM TRADE BANS

# csgoempire-deposit-autoconfirm
    For steam part, you need SDA to get the sharedSecret & identitySecret.
    [SDA](https://github.com/Jessecar96/SteamDesktopAuthenticator)

# Install
    Install nodejs
    clone the repo
    npm i 
    node index.js
# config.json
Set steam to false if you dont want to send the offer automatically. (need steam-desktop-authenticator to use that properly)

Set discord to false if you dont want to use that.


Create a config file like:
```
{
    "steam": true,
    "discord": true,
    "mainCookie": "PHPSESSID=csogempire_phpsessid-cookie; do_not_share_this_with_anyone_not_even_staff=csogempire_donotsharethiswithanyonenotevenstaff_cookie",
    "port": 3000,
    "domain": "leave-blank-if-steam-false",
    "accountName": "leave-blank-if-steam-false",
    "password": "leave-blank-if-steam-false",
    "sharedSecret": "leave-blank-if-steam-false",
    "identitySecret": "leave-blank-if-steam-false",
    "discordHook": "leave-blank-if-discord-false",
    "discordUserId": "leave-blank-if-discord-false"
}
```
