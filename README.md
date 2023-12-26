# RPA Restaurant menus to user automation
## What
App sends todays lunch menus of 5 nearest restaurants in chosen location to users(or multiple users) by email.
- Email consists of 5 Lunch menus & current weather
- Lunch menus and weather info can be requested by user anywhere anytime by ip geolocation
- Raw weather information is fetched from [Here](https://www.iltalehti.fi/saa) and processed by chatGPT
- Only works in Finland
## Why
Hunger
## How
Automation process always online. Node App on Render or similar.
Start Command:
```
node express.js
```
Required enviroment variables:
```
API_KEY=(OpenAI api key)
login=(Nodemailer "from" email)
user=(SMTP user)
pass=(SMTP key)
receiver1=(email of receiver (up to 4))
```

# Screenshot of email:
![image](https://github.com/Skoivumaki/RPA-Restaurant-menus-to-user-automation/assets/123396118/51c0cccd-a89e-4588-aa36-39f75455ce02)
