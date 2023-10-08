import express from "express";
import { Configuration, OpenAIApi } from "openai"
import fetch from "node-fetch";
import * as cheerio from 'cheerio';
import { createTransport } from 'nodemailer';
import { config } from "dotenv"
import { setInterval } from "timers/promises";
config()
const app = express();
var lastRun;

//function to get location of user
async function getLocation(userIP) {
  //debug
  const localdebugip = "91.153.222.47"

  const fetch_res = await fetch('https://ipapi.co/' + localdebugip + '/json/');
  const fetch_data = await fetch_res.json();
  const city = (fetch_data["city"]).toLowerCase();
  console.log('User IP: ' + userIP);
  console.log('User location: ' + city);
  return city;
}

//Sending daily email Ruoholahti only. for 4 receivers
async function dailyUpdate() {
  console.log('daily mail start');
  //store Date() when last function run
  lastRun = Date();

  const userCity = "ruoholahti";
  const weatherCurrent = await WeatherInfoAI(userCity);
  for (let index = 0; index < 3; index++) {
    //eval unsafe to be changed
    const receiver = (eval("process.env.receiver" + (index + 1)));
    const result = (await getMenu(userCity)).join("\n");
    nodemailer(result, receiver, weatherCurrent);
    break;
  }
}

//debug view
app.get("/timer", function (req, res) {
  res.send(lastRun);
});

//Email invidual request
app.get('/:id', async function (req, res) {

  //ID(email) check to avoid malicious use
  switch (req.params.id) {
    case process.env.receiver1:
      console.log('1');
      const userIP = req.ip;
      const userCity = await getLocation(userIP);
      const result = (await getMenu(userCity)).join("\n");
      const weatherCurrent = await WeatherInfoAI(userCity);
      console.log(result);
      nodemailer(result, req.params.id, weatherCurrent);
      break;

    default:
      console.log('invalid email')
      break;
  }
});

// Web server by express
var PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
  console.log("MongoDB app is listening on port %d", PORT);
});

const getMenu = async (city) => {
  //fetch html body data
  const response = await fetch('https://www.lounaat.info/' + city);
  const body = await response.text();
  const $ = cheerio.load(body);
  const menuList = [];
  // element select  
  $('.menu').each((i, title) => {

    //Apparently cheerio doesnt have proper for loops and if statement is needed
    if (i < 4) {
      //console debug
      console.log(i)
      const restau = $(title).find(".item-header h3").text();
      const time = $(title).find(".item-header p").text();
      console.log("Ravintola: ", restau);
      console.log("Lounasaika: ", time);
      console.log("Menu: ")

      //Add to list
      menuList.push("Ravintola: " + $(title).find(".item-header h3").text());
      menuList.push("Lounasaika: " + $(title).find(".item-header p").text());
      menuList.push("Menu: ");

      //Dish sort
      const menu = cheerio.load(title);
      menu("li").each((i, dish) => {
        //Check for invalid fields else add to list
        const dishvi = $(dish).find("p").text();
        const empty = $(dish).find(".missing");
        if (empty.length == 1) {
          menuList.push("Katso lounaslista ravintolan sivuilta :(");
        } else {
          const trim = dishvi.replace(/\s+/g, ' ').trim()
          menuList.push(trim);
          console.log(trim);
        }
      });
    }
  });
  return menuList;
};

function nodemailer(result, receiver, weatherCurrent) {
  //send weather data to process for ChatGPT
  const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.API_KEY
  }));

  //gpt-3.5-turbo
  openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ 'role': 'system', 'content': 'Tell user weather info' }, { role: "user", content: 'Kerro yhdellä lauseella millainen sää on: ' + weatherCurrent }],
    temperature: 0.7,
  }).then(res => {
    console.log(res.data.choices[0].message.content);
    const weather = res.data.choices[0].message.content;
    const emailmessage = result + '<br>' + weather + '<br><a href="http://127.0.0.1:8080/"' + receiver + '>Paina tästä jos haluat lounas menun nyt siellä missä olet</a>'
    emailmessage.toString;
    console.log(emailmessage.toString);
    const transporter = createTransport({
      //brevo
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: {
        user: process.env.user,
        pass: process.env.pass,
      },
    });

    const mailOptions = {
      from: process.env.login,
      to: receiver,
      subject: "Lounas menut tänään",
      text: emailmessage,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("mailOptions: " + mailOptions.text);
        console.log('Email sent: ' + info.response);
      }
    });
  })
}

async function WeatherInfoAI(userCity) {

  //somekind of weather api solution would be better but this is temporal
  //fetch html body data
  const response = await fetch('https://www.iltalehti.fi/saa/Suomi/' + userCity);
  const body = await response.text()
  const $ = cheerio.load(body);

  //fetch weather data from body and on error use default /Helsinki (since city regions are not supported in direct URL)
  const $selected = $('div .weather-hero');
  const $errorsearch = $('div .error-container')
  var data = "";
  if ($errorsearch.length == 1) {
    console.log('Error fetching forecast')
    const response = await fetch('https://www.iltalehti.fi/saa/Suomi/Helsinki');
    const body = await response.text()
    const $ = cheerio.load(body);
    const $selected = $('div .weather-hero');
    var data = $selected.text();
  } else {
    console.log('forecast fetch success')
    var data = $selected.text();
  }
  console.log(data);
  return data;
};

//Interval to send menu daily to users (replace with node cron)
setInterval(dailyUpdate, 1000 * 60 * 60 * 24);