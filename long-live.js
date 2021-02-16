const Discord = require("discord.js");
const config = require("./config.json");
const bot = new Discord.Client();
bot.login(config.token);

//okay! we've got the bot all set up and ready. now it's time for the big thing.

//VARS: HELP TEXT
let main_help_text = "\
Long Live - Help:\n\
Long Live is a social game playable entirely on Discord for 1-5 players.\n\
Commands:\n\
- help!: DMs the sender this help page.\
- the <title> is dead!: Initializes a new game. Long-Live will send a new-game message in response. Sender is automatically a player.\n\
- long live <name> the <title>!: Joins a game. Make sure to reply to the new-game message Long-Live sends. \
<name> will be your name in the game (leave it blank for a random name), and <title> is what you hope to be \
crowned at the game's conclusion (Queen, King, God-Emperox, etc.) (leave it blank for a random title)\n\
- exit!: Leaves whatever game you are in.\n\
- exuent!: Ends a game you are the owner of.\n\
- act 1, scene 1!: Begins the game. Causes all currently unassigned roles to be assigned randomly.";
let player_help_text = "NOT IMPLEMENTED?";

//VARS & HELPERS: NEW GAME TEXT
function new_game_title(title) { return "**The " + title + " Is Dead! Long Live ...?**\n"}
function new_game_tagline(state) { return "*A new game of text-based intrigue and betrayal " + state + ".*\n"}
function new_game_players(players) { return "Players (" + players.length + "/5): \n- " + players.join('\n- ') + "\n"; }
let new_game_help = "Use the command 'long live <name> the <title>!' (ex: 'Long Live Long-Live the Best Bot!') to join the game! \
Once you've joined, react to choose your role:\n\
:ghost: The Grim | \
:crown: The Heir | \
:wine_glass: The Advisor | \
:church: The Bishop | \
:crossed_swords: The Captain | \
:game_die: Random\n\
";
function new_game_text(title, state, players) { return new_game_title(title) + new_game_tagline(state) + new_game_players(players) + new_game_help; }

//HELPERS: Command parsing for complex wildcarded inline commands
function commandMatch(command, key) {
    //takes a string command, returns true if it matches the key and false otherwise
    var lowCommand = command.toLowerCase();
    keyWords = key.split('*');
    //console.log("Command: " + lowCommand + " KeyWords: " + keyWords);
    for (var i = 0; i < keyWords.length; i++) {
        keyWordStarts = lowCommand.indexOf(keyWords[i]);
        if (keyWordStarts == -1) {
            //console.log("Could not find Keyword: (" + keyWords[i] + ") within " + lowCommand);
            return false;
        }
        lowCommand = lowCommand.slice(keyWordStarts + keyWords[i].length);
        //console.log("Updated varCommand: " + lowCommand);
    }
    if (lowCommand.length == 0) {
        return true;
    }
    return false;
}

function commandArgs(command, key) {
    //takes a string command and a key, returns the arguments of the command.
    //should only be run if commandMatch has returned true for the given command and key!
    if (!commandMatch(command,key)) {
        console.error("Command does not match key! Command: " + command + ", Key: " + key);
    }
    var varCommand = command.slice();
    var lowCommand = command.toLowerCase();
    var args = [];
    keyWords = key.toLowerCase().split('*');
    //console.log("Command: " + varCommand + " KeyWords: " + keyWords);
    for (var i = 0; i < keyWords.length; i++) {
        keyWordStarts = lowCommand.indexOf(keyWords[i]);
        if (keyWordStarts > 0) {
            args.push(varCommand.slice(0,keyWordStarts));
            //console.log("Found arg: " + varCommand.slice(0,keyWordStarts));
        } else if (keyWordStarts == 0 && i != 0) {
            args.push('');
            //console.log("Missing arg.")
        }
        varCommand = varCommand.slice(keyWordStarts + keyWords[i].length);
        lowCommand = lowCommand.slice(keyWordStarts + keyWords[i].length);
        //console.log("Updated varCommand: " + varCommand);
    }
    return args;
}

//VARS: master variables for storing different games, indexed by main channel
var gamesByChannel = {}
var gamesByPlayer = {}

//CLASS: Game, a complex class containing a full game.
class Game {
    //constructor - when game is first initialized by the owner
    constructor(main_channel, main_message, title, owner) {
        console.log("New Game: The " + title + " Is Dead! Owner: " + owner.username);
        this.main_channel = main_channel; this.main_message = main_message; this.title = title; this.owner = owner;
        this.players = [];
        this.state = 'is beginning';
    }
    //mainText - renders the game into a piece of text in the main channel
    mainText() {
        return new_game_text(this.title, this.state, this.playerTexts());
    }
    //exuentText - renders the game into a short message marking a closed game.
    exuentText() {
        return new_game_title(this.title) + "*A game of text-based intrigue and betrayal has been cancelled successfully.*";
    }
    //playerTexts - renders the players into text:
    playerTexts() {
        var texts = []
        for (var i in this.players) {
            texts.push(this.players[i].mainText())
        }
        return texts;
    }
    //newPlayer - adds a new player to the game (if there is room)
    newPlayer(player, name, title) {
        if (this.players.length < 5) {
            for (var i in this.players) {
                if (this.players[i].name == name || this.players[i].player == player) {
                    return false
                }
            }
            let new_player = new Player(player, name, title, this);
            gamesByPlayer[player.id] = this
            this.players.push(new_player);
            return true;
        } else {
            //too many players, can't add any new ones!
            return false;
        }
    }
    //removePlayer - removes a player from the game (if they are in the game)
    removePlayer(player) {
        //let index = this.players.indexOf(player);
        for (var i in this.players) {
            if (this.players[i].player == player) {
                this.players.splice(i,1);
                gamesByPlayer[player.id] = null;
                return true;
            }
        }
        return false;
    }
    //exuent - removes all players and this game from the record
    exuent() {
        for (var i in this.players) {
            gamesByPlayer[this.players[i].id] = null;
        }
        gamesByChannel[this.main_channel.id] = null;
    }
}

//CLASS: Player, a class representing a player in a game
class Player {
    //constructor - when a player joins a game
    constructor(player, name, title, game) {
        this.player = player; this.name = name; this.title = title; this.game = game;
    }
    //mainText - formatting whatever information about a player is available into something suitable for the main text
    mainText() {
        if (this.role != null) {
            return this.player.username + " *as* " + this.name + " the " + this.role;
        } else {
            return this.player.username + " *as* " + this.name;
        }
    }

}

//MARK: STARTUP
bot.once('ready', () => {
    console.log('Bot Logged In And Ready!');
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
    let msg = message.content;
    let words = msg.split(' ');

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
        } else if (commandMatch(msg, 'the * is dead!')) {
            //new game - permissions check?
            let title = commandArgs(msg, 'the * is dead!')[0];
            message.channel.send(new_game_text(title,'is beginning',[]))
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
            var game = gamesByPlayer[message.author.id];
            if (game != null) {
                if (game.removePlayer(message.author)) {
                    //message.react('✅');
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
            var game = gamesByChannel[message.channel.id];
            if (game != null) {
                if (game.owner == message.author) {
                    game.exuent();
                    game.main_message.edit(game.exuentText());
                    delete game;
                } else {
                    message.react('🚫');
                }
                //message.react('✅');
            } else {
                message.react('🚫');
            }
        } else if (msg.toLowerCase() == 'act 1, scene 1!') {
            //start game
            console.log("UNIMPLEMENTED!")
        } else if (commandMatch(msg, 'long live * the *!')) {
            //join game
            let args = commandArgs(msg, 'long live * the *!');
            let name = args[0]; let title = args[1];
            var game = gamesByChannel[message.channel.id];
            if (game != null) {
                if (game.newPlayer(message.author, name, title)) {
                    //message.react('✅');
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
    } else {
        console.log("ERROR: What kind of channel is this?");
        console.log(message);
    }
})