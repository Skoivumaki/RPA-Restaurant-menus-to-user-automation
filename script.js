import { config } from "dotenv"
config()

import { Configuration, OpenAIApi } from "openai"
import * as fs from 'fs';
import promptSync from 'prompt-sync';
import fetch from "node-fetch";
import * as cheerio from 'cheerio';
import { createTransport } from 'nodemailer';

const getMenu = async () => {

    //fetch html body data
    const response = await fetch('https://www.lounaat.info/kirkkonummi');
    const body = await response.text();
    const $ = cheerio.load(body);
    const titleList = [];
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
                if (empty.length == 1){
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

const prompt = promptSync();
const input = prompt('Input?');
console.log(`Chosen ${input}`);
  
switch (input) {
    case "1":
        fs.readFile("output.txt", (err, data) => {
            if (err) {
                console.error(err);
                return;
            }
            data = Buffer.from(data, 'utf-8').toString();
            console.log("Read from discord "+data);
            data = data.replace("(Oclub 18 dj ", "");
            console.log("Data after manipulation "+data);
            start(data);
        });;
    case "2":
        const result = (await getMenu()).join("\n");
        //console.log("Return: "+result);
        nodemailer(result);
        break;
    default:
        break;
}

function nodemailer(result) {
    const transporter = createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        auth: {
            user: process.env.user,
            pass: process.env.pass,
        },
    });
    
    const mailOptions = {
        from: process.env.login,
        to: process.env.receiver,
        subject: "Lounas menut tänään",
        text: result
    };
    
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

function start (data){
const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.API_KEY
}));

//gpt-3.5-turbo
 openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{'role':'system', 'content':'You are an friend of the user and only speak finnish. You pretend to be human and dont declare yourself as AI'},{ role: "user", content: data}],
    temperature: 0.7,
 }).then(res => {
    console.log(res.data.choices[0].message.content); 
     try {
         fs.writeFileSync('output.txt', res.data.choices[0].message.content);   
         } catch (err) {
             console.error(err);
     } finally {
         process.exit();
     }
})};