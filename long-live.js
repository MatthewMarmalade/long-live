const Discord = require("discord.js");
const config = require("./config.json");
const bot = new Discord.Client();
bot.login(config.token);

//okay! we've got the bot all set up and ready. now it's time for the big thing.

//note: use their majesty if people don't specify.

//VARS: HELP TEXT
const main_help_text = "\
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
const player_help_text = "NOT IMPLEMENTED?";

//VARS & HELPERS: NEW GAME TEXT
function playbill_title(title) { return "**" + title + " Is Dead! Long Live ...?**\n"}
function playbill_tagline(state) { return "*A new game of text-based intrigue and betrayal " + state + ".*\n"}
function playbill_players(players) { return "Players (" + players.length + "/5): \n- " + players.join('\n- ') + "\n"; }
const playbill_help = "Use the command `long live <name> the <title>!` to join the game! (ex: `Long Live Long-Live the Best Bot!`) \
You can use the command `exit!` to leave the game again. Once you've joined, react to choose your role:\n\
:ghost: The Grim | :crown: The Heir | :wine_glass: The Advisor | :church: The Bishop | :crossed_swords: The Captain | :game_die: Random\n\
";
function playbill_text(title, state, players) { return playbill_title(title) + playbill_tagline(state) + playbill_players(players) + playbill_help; }

//VARS: RANDOM NAMES
const macbeth_names = ['Duncan', 'Malcolm', 'Donalbain', 'Macbeth', 'Lady Macbeth', 'Banquo', 'Fleance', 'Macduff', 'Lennox', 'Ross', 'Menteith', 'Angus', 'Caithness', 'Lady Macduff', 'Hecate', 'Young Siward', 'Seyton'];
const hamlet_names = ['Hamlet', 'Polonius', 'Rosencrantz', 'Guildenstern', 'Ophelia', 'Gertrude', 'Claudius', 'Horatio', 'Laertes', 'Fortinbras'];
const random_names = [].concat(macbeth_names,hamlet_names);

//HELPERS: Random Choice
function randomPop(array) {
    //const random = Math.random();
    //console.log("length: " + array.length + " random: " + random + " floored: " + Math.floor(random * array.length));
    return array.splice(Math.floor(Math.random() * array.length),1);
}

//HELPERS: Command parsing for complex wildcarded inline commands
function commandMatch(command, key) {
    //takes a string command, returns true if it matches the key and false otherwise
    let lowCommand = command.toLowerCase();
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
        return [];
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
        this.random_names = random_names.slice();
    }
    //randomName - returns a random unique name for a player.
    randomName() {
        console.log("Random name from: " + this.random_names);
        if (this.random_names.length == 0) {
            this.random_names = random_names.slice();
            console.log("Names empty, replaced with: " + random_names);
        }
        return randomPop(this.random_names);
    }
    //mainText - renders the game into a piece of text in the main channel
    mainText() {
        return playbill_text(this.title, this.state, this.playerTexts());
    }
    //exuentText - renders the game into a short message marking a closed game.
    exuentText() {
        return playbill_title(this.title) + "*A game of text-based intrigue and betrayal has been cancelled successfully.*";
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
            return this.player.username + " *as* " + this.role + " " this.name;
        } else {
            return this.player.username + " *as* " + this.name;
        }
    }
}

//MARK: STARTUP
bot.once('ready', () => {
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
        } else if (commandMatch(msg, 'the * is dead!') || msg.toLowerCase() == 'their majesty is dead!') {
            //new game - permissions check?
            var old_game = gamesByChannel[message.channel.id];
            if (old_game != null) {
                old_game.exuent();
                old_game.main_message.edit(old_game.exuentText());
                delete old_game;
            }
            const title = commandMatch(msg, 'the * is dead!') ? 'The ' + commandArgs(msg, 'the * is dead!')[0] : 'Their Majesty';
            message.channel.send(playbill_text(title,'is beginning',[]))
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
            let game = gamesByPlayer[message.author.id];
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
            //permissions check?
            var game = gamesByChannel[message.channel.id];
            if (game != null) {
                game.exuent();
                game.main_message.edit(game.exuentText());
                delete game;
            } else { message.react('🚫'); }
        } else if (msg.toLowerCase() == 'act 1, scene 1!') {
            //start game
            console.log("UNIMPLEMENTED!")
        } else if (commandMatch(msg, 'long live * the *!') || commandMatch(msg, 'long live the *!') || msg.toLowerCase() == 'long live!') {
            //join game
            var game = gamesByChannel[message.channel.id];
            if (game != null) {
                //get the name and title of the player
                var name = game.randomName(); var title = 'Their Majesty';
                if (commandMatch(msg, 'long live * the *!')) {
                    const args = commandArgs(msg, 'long live * the *!');
                    name = args[0]; title = 'The ' + args[1];
                } else if (commandMatch(msg, 'long live the *!')) {
                    const args = commandArgs(msg, 'long live the *!');
                    title = 'The ' + args[0]; //name will still be random
                } //else just use defaults.

                //use the name and title to add a new player
                if (game.newPlayer(message.author, name, title)) {
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

bot.on('messageReactionAdd', (reaction, user) => {
    //console.log(reaction._emoji.name);
    if (user.bot) {
        return;
    }

    var game = gamesByChannel[reaction.message.channel];
    if (game != null) {
        if (reaction.message == game.main_message) {
            var player = game.getPlayer(user)
            if (player != null) {
                //need to make sure that for normal roles, there's only one per.
                if (reaction.count <= 2 || reaction._emoji.name == '🎲') {
                    reaction.users.remove(user.id);
                }

                /*
                switch (reaction._emoji.name) {
                    case '👻': game.roles['grim'] == null ? game.newRole(user, 'grim') :  break;
                    case '👑': break;
                    case '🍷': break;
                    case '⛪': break;
                    case '⚔️': break;
                    case '🎲': break;
                    default: console.log("ERROR: Unknown Reaction: " + reaction._emoji.name); break;
                }
                */
            }
        }
    }
})
