# csgoempire-deposit-autoconfirm

Set steam to false if you dont want to send the offer automatically. (need steam-desktop-authenticator to use that properly)

Set discord to false if you dont want to use that.


Create a config file like:
```
{
    "steam": true,
    "discord": true,
    "port": 3000,
    "domain": "localhost",
    "identitySecret": "leave-blank-if-steam-false",
    "accountName": "leave-blank-if-steam-false",
    "password": "leave-blank-if-steam-false",
    "sharedSecret": "leave-blank-if-steam-false",
    "mainCookie": "PHPSESSID=csogempire_phpsessid-cookie; do_not_share_this_with_anyone_not_even_staff=csogempire_donotsharethiswithanyonenotevenstaff_cookie",
    "discordHook": "leave-blank-if-discord-false",
    "discordUserId": "leave-blank-if-discord-false"
}
```
