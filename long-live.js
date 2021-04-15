//STARTUP AND IMPORTS
const Discord = require("discord.js");
const Game = require("./game.js");
// const Player = require("./player.js");
// const AI = require("./ai.js");
// const Day = require("./day.js");
// const News = require("./news.js");
// const Location = require("./location.js");
const action = require('./action.js');
const helper = require('./helper.js');
const config = require("./config.json");
const bot = new Discord.Client();
bot.login(config.token);

//HELPER: Redirects
const commandMatch = helper.commandMatch;
const commandArgs = helper.commandArgs;

//VARS: master variables for storing different games, indexed by main channel or by user id
var gamesByChannel = {}
var gamesByUser = {}

//VARS: LOGO
/*
    /\
  ._][_.
 |\/\/\/|
 |______|
    ||
     ▏
*/

/*
//CLASS: Petition - represents a request for a particular action by a particular faction
class Petition {
    constructor(location,action,player,deadline) {
        this.location = location; this.action = action; this.player = player; this.deadline = deadline;
    }
    //fullText
    fullText() {
        return '**' + this.location.randomPerson() + '**. If you have ' + this.action.toText() + ' within the next ' + this.deadline + ' days we would appreciate it.';
    }
}

*/

//MARK: STARTUP
bot.once('ready', () => {
    var test_action = new action.End(1);
    console.log(test_action);
    console.log('Long-Live Logged In And Ready!');
})



//MARK: MESSAGE HANDLING
bot.on('message', message => {
    //console.log(message);
    if (message.author.bot) {
        return; //don't want to log bot messages right now! comment to log bot messages.
    }
    //so, we've received a message. it could be from *anywhere*, unfortunately.
    //we should use the type of the channel to divide between text channels and dms.
    //if it's a text channel, it's probably some kind of setup command, and so all
    //we need to do is divide by channel id.
    //if it's a dm channel, it's a bit of gameplay. we need to identify what game the
    //player is in if they are in any games.
    const msg = message.content;
    //const words = msg.split(' ');

    if (message.channel.type == 'text') {
        //from text-channel command options:
        // - help
        // - new game?
        // - joining game?
        // - beginning game
        // - cancelling game
        if (msg.toLowerCase() == 'help!') {
            //help page
            message.author.send(main_help_text);
        } else if (commandMatch(msg, 'quick!')) {
        	var old_game = gamesByChannel[message.channel.id];
            if (old_game != null) {
                console.log("ERROR: Should not start a new game while the old one is still available.");
                message.react('🚫');
                return;
            }
            var new_game
            message.channel.send('LONGLIVE: quick game starting.')
            	.then(text => target = text)
            	.then(() => new_game = new Game(message.channel, target, 'Their Majesty', message.author))
            	.then(() => gamesByChannel[message.channel.id] = new_game)
            	.then(() => player = new_game.newPlayer(message.author, new_game.randomName(), 'Their Majesty'))
            	.then(() => gamesByUser[message.author.id] = new_game)
            	.then(() => new_game.start())
            	.catch(console.error);
        } else if (commandMatch(msg, 'the * is dead!') || msg.toLowerCase() == 'their majesty is dead!') {
            //new game - permissions check?
            var old_game = gamesByChannel[message.channel.id];
            if (old_game != null) {
                // old_game.exuent();
                // old_game.main_message.edit(old_game.exuentText());
                // delete old_game;
                console.log("ERROR: Should not start a new game while the old one is still available.");
                return;
            }
            var title = commandMatch(msg, 'the * is dead!') ? 'The ' + helper.commandArgs(msg, 'the * is dead!')[0] : 'Their Majesty';
            title = helper.titleCase(title);
            message.channel.send(helper.playbill_text(title,'is beginning',[]))
                .then(text => target = text)
                .then(() => new_game = new Game(message.channel, target, title, message.author))
                .then(() => gamesByChannel[message.channel.id] = new_game)
                .then(() => target.react('👻'))
                .then(() => target.react('👑'))
                .then(() => target.react('🍷'))
                .then(() => target.react('⛪'))
                .then(() => target.react('⚔️'))
                .then(() => target.react('🎲'))
                .catch(console.error);
        } else if (msg.toLowerCase() == 'exit!') {
            let game = gamesByUser[message.author.id];
            if (game != null) {
                if (game.removePlayer(message.author)) {
                    //message.react('✅');
                    gamesByUser[message.author.id] = null;
                    game.main_message.edit(game.mainText());
                } else {
                    message.react('🚫');
                }
            } else {
                message.react('🚫');
            }
            //leave game
        } else if (msg.toLowerCase() == 'exuent!') {
            //cancel game
            //permissions check?
            var game = gamesByChannel[message.channel.id];
            if (game != null) {
                //game.exuent(gamesByUser);
                for (var p in game.players) {
                	gamesByUser[game.players[p].user.id] = null;
                }
                gamesByChannel[game.main_channel.id] = null;
                game.main_message.edit(game.exuentText());
                game.main_message.reactions.removeAll();
                delete game;
            } else { message.react('🚫'); }
        } else if (msg.toLowerCase() == 'act 1, scene 1!') {
            //start game
            var game = gamesByChannel[message.channel.id];
            if (game != null) {
                if (game.start()) {
                    //we're all good!
                    game.main_message.edit(game.mainText());
                } else {
                    message.react('🚫');
                }
            } else {
                message.react('🚫');
            }
        } else if (commandMatch(msg, 'long live * the *!') || commandMatch(msg, 'long live *!') || msg.toLowerCase() == 'long live!') {
            //join game
            var game = gamesByChannel[message.channel.id];
            if (game != null) {
                //get the name and title of the player
                var name = game.randomName(); var title = 'Their Majesty';
                if (commandMatch(msg, 'long live * the *!')) {
                    const args = commandArgs(msg, 'long live * the *!');
                    name = args[0]; title = 'The ' + args[1];
                } else if (commandMatch(msg, 'long live *!')) {
                    const args = commandArgs(msg, 'long live *!');
                    name = args[0]//title = 'The ' + args[0]; //name will still be random
                } //else just use defaults.

                //use the name and title to add a new player
                if (game.newPlayer(message.author, name, title)) {
                    gamesByUser[message.author.id] = game;
                    game.main_message.edit(game.mainText());
                } else {
                    message.react('🚫');
                }
            } else {
                message.react('🚫');
            }
            //console.log("Welcome, " + args[0] + " the " + args[1] + "!");
        } else {
            console.log("Unknown Command: " + msg);
        }
    } else if (message.channel.type == 'dm') {
        //from dm command options:
        //game commands:
        //non-game commands: 
        // - help
        var game = gamesByUser[message.author.id];
        if (game != null) {
            var player = game.getPlayerByUser(message.author);
            if (player != null) {
                var truth; var lie; var flavor;
                if (commandMatch(msg,'[* | *] "*"')) {
                    var args = commandArgs(msg, '[* | *] "*"');
                    truth = args[0]; lie = args[1]; flavor = args[2];
                } else if (commandMatch(msg,'[* | *]')) {
                    var args = commandArgs(msg, '[* | *]');
                    truth = args[0]; lie = args[1]; flavor = null;
                } else if (commandMatch(msg, '[*] "*"')) {
                    var args = commandArgs(msg, '[*] "*"');
                    truth = args[0]; lie = args[0]; flavor = args[1];
                } else if (commandMatch(msg, '[*]')) {
                    var args = commandArgs(msg, '[*]');
                    truth = args[0]; lie = args[0]; flavor = null;
                } else {
                    //not a command, just ignore
                    console.log("LOG: User + " + message.author.username + " has sent a non-command message: " + msg);
                }
                //truth, lie, and flavor are extracted now. now we need to validate and identify the commands.

                var response = game.newAction(player, truth, lie, flavor);
                if (response != null) {
                	console.log("Action successful! + " + response);
                    //then the action was successful
                    game.nextDay();
                } else {
                    //then the action was not successful
                    console.log("ERROR: Response null: " + response);
                    message.react('🚫');
                }
            } else {
                console.log("ERROR: Player Not Found");
                message.react('🚫');
            }
        } else {
            console.log("ERROR: Game Not Found");
            message.react('🚫');
        }
    } else {
        console.log("ERROR: What kind of channel is this?");
        console.log(message);
    }
})

bot.on('messageReactionAdd', (reaction, user) => {
    //console.log(reaction);
    if (user.bot) {
        //console.log("Just a bot, nothing to see here!");
        return;
    }

    if (reaction.message.channel.type == 'text') {
        var game = gamesByChannel[reaction.message.channel.id];
        if (game != null && game.state == 'is beginning') {
            //console.log("LOG: Found Game!");
            if (reaction.message == game.main_message) {
                //console.log("LOG: Correct Game!");
                var player = game.getPlayerByUser(user)
                if (player != null) {
                    //console.log("LOG: Found Player!");
                    //need to make sure that for normal roles, there's only one per.
                    if (reaction.count <= 2 || reaction._emoji.name == '🎲') {
                        //console.log("LOG: Within Reaction Quota!");
                        game.setRole(player, reaction);
                        game.main_message.edit(game.mainText());
                    } else { reaction.users.remove(user.id); }
                } else { reaction.users.remove(user.id); }
            }
        } else if (game != null && game.state != 'is beginning') {
            reaction.users.remove(user.id);
        }
    } else if (reaction.message.channel.type == 'dm') {
        var game = gamesByUser[user.id];
        if (game != null && game.state == 'has begun') {
            console.log("LOG: Found Game!");
            var player = game.getPlayerByUser(user);
            if (player != null) {
            	//console.log(reaction);
                game.newReaction(player,reaction);
            }
        }
    }
})

bot.on('messageReactionRemove', (reaction, user) => {
    //no way to check for bot
    var game = gamesByChannel[reaction.message.channel.id];
    if (game != null && game.state == 'is beginning') {
        //console.log("LOG: Found Game");
        if (reaction.message == game.main_message) {
            //console.log("LOG: Correct Game");
            var player = game.getPlayerByUser(user);
            if (player != null) {
                //console.log("LOG: Found Player");
                if (player.reaction == reaction) {
                    //console.log("LOG: Need to remove role!");
                    game.setRole(player, null);
                    game.main_message.edit(game.mainText());
                } else {
                    //console.log("LOG: Don't need to remove role!");
                }
            }
        }
    }
})