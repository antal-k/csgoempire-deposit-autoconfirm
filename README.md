## CSGOEmpire deposit bot w/ auto confirm, steam offer send & discord integration

#### USE THIS CODE AT YOUR OWN RISK, I DON'T TAKE RESPONSIBILITY FOR STEAM TRADE BANS

For steam part, you need [SDA](https://github.com/Jessecar96/SteamDesktopAuthenticator) to get the sharedSecret & identitySecret.
#### If you remove your authenticator from your mobile, you will face 15days tradeban

# How to
    Install nodejs -> https://nodejs.org/dist/v12.17.0/node-v12.17.0-x64.msi
    Clone this repository
    Unzip
    Open a cmd line in that folder you extracted the files
    Type: npm i (it will install all the dependencies)
    Create the config.json file (description below)
    node index.js
# config.json

Set steam to false if you dont want to send the offer automatically. (need steam-desktop-authenticator to use that properly)

Set discord to false if you dont want to use that.

# Cookies
This script need 2 cookie from your browser. (Sadly empire doesn't support API keys for their api yet.)
    
    PHPSESSID
    do_not_share_this_with_anyone_not_even_staff
    
You have to put the correct cookies to the config.json
    
Create a config file (config.json) like:
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
