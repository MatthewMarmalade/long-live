const Discord = require("discord.js");
const config = require("./config.json");
const bot = new Discord.Client();
bot.login(config.token);

bot.once('ready', () => {
    console.log('Bot Logged In And Ready!');
})

bot.on('message', message => {
    console.log('LOG: New Message: ' + message.content);
})