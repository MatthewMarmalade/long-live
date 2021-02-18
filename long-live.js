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
function playbill_text(title, state, players) { return playbill_title(title) + playbill_tagline(state) + playbill_players(players) + (state == 'is beginning' ? playbill_help : ''); }

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

function randomChoice(array) {
    return array.slice()[Math.floor(Math.random() * array.length)];
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
var gamesByUser = {}

//CLASS: Game, a complex class containing a full game.
class Game {
    //constructor - when game is first initialized by the owner
    constructor(main_channel, main_message, title, owner) {
        console.log("New Game: The " + title + " Is Dead! Owner: " + owner.username);
        this.main_channel = main_channel; this.main_message = main_message; this.title = title; this.owner = owner;
        this.players = [];
        this.state = 'is beginning';
        this.random_names = random_names.slice();
        this.day = new Day(0);
        this.throne = new Location('Throne Room'); this.courtyard = new Location('Courtyard'); this.ballroom = new Location('Ballroom');
        this.chapel = new Location('Chapel'); this.barracks = new Location('Barracks');
        this.locations = {'Throne Room':this.throne,'Courtyard':this.courtyard,'Ballroom':this.ballroom,'Chapel':this.chapel,'Barracks':this.barracks,
                          'Spirit':this.throne,'Common':this.courtyard,'Noble':this.ballroom,'Church':this.chapel,'Guard':this.barracks};
        this.roles = {'Grim':null,'Heir':null,'Advisor':null,'Bishop':null,'Captain':null,'Mysterious':[]};
    }
    //randomName - returns a random unique name for a player.
    randomName() {
        //console.log("Random name from: " + this.random_names);
        if (this.random_names.length == 0) {
            this.random_names = random_names.slice();
            //console.log("Names empty, replaced with: " + random_names);
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
    newPlayer(user, name, title) {
        if (this.state != 'is beginning') {
            console.log("ERROR: Should not add new players while the game is not beginning!");
            return;
        }
        if (this.players.length < 5) {
            for (var i in this.players) {
                if (this.players[i].name == name || this.players[i].user == user) {
                    return false
                }
            }
            let new_player = new Player(user, name, title, this);
            gamesByUser[user.id] = this
            this.players.push(new_player);
            return true;
        } else {
            //too many players, can't add any new ones!
            return false;
        }
    }
    //removePlayer - removes a player from the game (if they are in the game)
    removePlayer(user) {
        //let index = this.players.indexOf(player);
        if (this.state != 'is beginning') {
            console.log("ERROR: Should not remove a player while the game is not beginning, or else handle this eventuality!");
            return;
        }
        var player;
        for (var i in this.players) {
            player = this.players[i];
            if (player.user == user) {
                if (player.role == 'Mysterious') {
                    //console.log("Mysterious removal check BEFORE: " + this.roles['Mysterious'])
                    this.roles['Mysterious'].splice(this.roles['Mysterious'].indexOf(player),1);
                    //console.log("Mysterious removal check AFTER: " + this.roles['Mysterious']);
                } else if (player.role != null) {
                    this.roles[player.role] = null;
                }
                if (player.reaction != null) {
                    player.reaction.users.remove(player.user.id);
                }
                this.players.splice(i,1);
                gamesByUser[user.id] = null;
                return true;
            }
        }
        return false;
    }
    //getPlayer - returns the player corresponding to the discord user or null otherwise
    getPlayer(user) {
        for (var i in this.players) {
            if (this.players[i].user == user) {
                return this.players[i]
            }
        }
        return null;
    }
    //setRole - sets a role to a player within the game
    setRole(player,reaction) {
        if (this.state != 'is beginning') {
            console.log("ERROR: Should not set roles while game not beginning!");
            return;
        }
        if (player.role == 'Mysterious') {
            //console.log("Mysterious removal check BEFORE: " + this.roles['Mysterious'])
            this.roles['Mysterious'].splice(this.roles['Mysterious'].indexOf(player),1);
            //console.log("Mysterious removal check AFTER: " + this.roles['Mysterious']);
        } else if (player.role != null) {
            this.roles[player.role] = null;
        }
        if (player.reaction != null) {
            //console.log("Removing Reaction BEFORE.")
            player.reaction.users.remove(player.user.id);
        }
        player.reaction = reaction;
        if (reaction != null) {
            switch (reaction._emoji.name) {
                case '👻': player.role = 'Grim'; this.roles['Grim'] = player; break;
                case '👑': player.role = 'Heir'; this.roles['Heir'] = player; break;
                case '🍷': player.role = 'Advisor'; this.roles['Advisor'] = player; break;
                case '⛪': player.role = 'Bishop'; this.roles['Bishop'] = player; break;
                case '⚔️': player.role = 'Captain'; this.roles['Captain'] = player; break;
                case '🎲': player.role = 'Mysterious'; this.roles['Mysterious'].push(player); break;
                case null: break;
                default: console.log("ERROR: Unknown Reaction: " + reaction._emoji.name); return;
            }
        } else {
            player.role = null;
        }
    }
    //exuent - removes all players and this game from the record
    exuent() {
        for (var i in this.players) {
            gamesByUser[this.players[i].user.id] = null;
        }
        gamesByChannel[this.main_channel.id] = null;
    }
    //start - begins the game.
    start() {
        if (this.players.length == 0) {
            return false;
        } else {
            this.state = 'has begun';
            var rolesRemaining = ['Grim','Heir','Advisor','Bishop','Captain'];
            var mysteries = [];
            //need to extract all the roles that aren't defined!
            for (var i in this.players) {
                if (this.players[i].role == 'Mysterious' || this.players[i].role == null) {
                    //then the player is random
                    mysteries.push(this.players[i]);
                } else {
                    //then the player's role should be removed from the rolesRemaining
                    rolesRemaining.splice(rolesRemaining.indexOf(this.players[i].role),1);
                }
            }
            for (var m in mysteries) {
                var role = randomPop(rolesRemaining);
                mysteries[m].role = role;
                this.roles[role] = mysteries[m]
            }
            this.roles['Mysterious'] = [];
            //message all players to say the game is starting
            for (var i in this.players) {
                this.players[i].user.send("**" + this.title + " is Dead, Long Live ..." + this.players[i].fullName() + "?**\n*The throne lies empty. Perhaps it is yours for the taking. The game begins.*");
                let first_news = new News(this.day,Math.floor(Math.random() * 12),this.players[i].home(),this.players[i],this.players[i].defaultAction(),this.players[i].defaultAction(),this.players[i].defaultFlavor());
                this.day.news.push(first_news);
                //this.nextDay();
                //this.players[i].user.send("")
            }
            this.nextDay();
            return true;
        }
    }
    //nextDay - advances the day, sends out news to everyone
    nextDay() {
        //this.day.nextDay();
        //?
        for (var i in this.players) {
            var player = this.players[i];
            var newsTexts = player.getRelevantNewsTexts(this.day.news);
            var message = '** NEWS ** *Whispers filter in at 10th bell about the movements of others the previous day...*\n-' + 
            newsTexts.join('\n-');
            player.user.send(message);
        }
        this.day = this.day.nextDay();
    }
}

//CLASS: Day, a class representing a day
class Day {
    constructor(day, game) {
        this.day = day; this.game = game;
        this.news = [];
    }
    nextDay() {
        //?
        return new Day(this.day + 1, this.game);
    }
    toText() {
        return 'Day ' + this.day;
    }
}

//HELPER: Time int to text
//10-11 11-12 12-13 13-14 14-15 15-16 16-17 17-18 18-19 19-20 20-21 21-22
function timeText(time) {
    //console.log(time);
    return String(time + 10) + 'th bell';
}

//CLASS: Location, a class representing a part of the castle
class Location {
    constructor(location, game) {
        this.game = game;
        if (location == 'Throne Room' || location == 'Courtyard' || location == 'Ballroom' || location == 'Chapel' || location == 'Barracks') {
            this.location = location;
        } else {
            console.log("ERROR: NON-STANDARD LOCATION - TRACE");
            this.location = 'Courtyard';
        }
    }
    toText() {
        return 'the ' + this.location;
    }
    factionText() {
        switch (this.location) {
            case 'Throne Room': return 'the Castle Spirits';
            case 'Courtyard': return 'the Common Folk';
            case 'Ballroom': return 'the High Nobility';
            case 'Chapel': return 'the Holy Church';
            case 'Barracks': return 'the Castle Guard';
        }
    }
}

//CLASS: Player, a class representing a player in a game
class Player {
    //constructor - when a player joins a game
    constructor(user, name, title, game) {
        this.user = user; this.name = name; this.title = title; this.game = game;
    }
    //mainText - formatting whatever information about a player is available into something suitable for the main text
    mainText() {
        return this.user.username + " *as* " + this.fullName();
    }
    //fullName() - role and name together.
    fullName() {
        if (this.role != null) {
            return this.role + " " + this.name;
        } else {
            return this.name;
        }
    }
    //home - the player's starting location
    home() {
        if (this.homeLocation != null) {
            return this.homeLocation;
        } else {
            switch (this.role) {
                case 'Grim': this.homeLocation = this.game.throne; break;
                case 'Heir': this.homeLocation = this.game.courtyard; break;
                case 'Advisor': this.homeLocation = this.game.ballroom; break;
                case 'Bishop': this.homeLocation = this.game.chapel; break;
                case 'Captain': this.homeLocation = this.game.barracks; break;
                default: console.log("ERROR: Unknown role in home assignment: " + this.role); this.homeLocation = this.game.courtyard; break;
            }
            return this.homeLocation;
        }
    }
    defaultAction() {
        if (this.default != null) {
            return this.default;
        } else {
            /*switch (this.role) {
                case 'Grim': this.default = Visit(this.home()); break;
                case 'Heir': this.default = Visit(this.home()); break;
                case 'Advisor': this.default = Visit(this.home()); break;
                case 'Bishop': this.default = Location('Church'); break;
                case 'Captain': this.default = Location('Barracks'); break;
                default: this.default = Visit(this.home()); break;
            }
            */
            this.default = new Visit(this.home());
            return this.default;
        }
    }
    defaultFlavor() {
        //this.default();
        return this.defaultAction().flavor();
    }
    getRelevantNewsTexts(news) {
        var texts = [];
        for (var n in news) {
            texts.push(news[n].noTruth());
        }
        return texts;
    }
}

//CLASS: News, a class representing a piece of news in a game.
class News {
    //constructor - when an action creates news
    constructor(day, time, location, player, truth, lie, flavor) {
        this.day = day; this.time = time; this.location = location; this.player = player; this.truth = truth; this.lie = lie; this.flavor = flavor;
    }
    //toText - renders the news as a simple line of text.
    //argument structure: ['day','time'] = day and time of news.
    noTime() {       // day location player claim flavor 'On 12 December 1341, Hamlet investigated Claudius in the throne room, saying: "Hmm, I don't like this."'
        return 'On ' + this.day.toText() + ', ' + this.player.fullName() + ' ' + this.claim() + ' in ' + this.location.toText() + ', saying: "' + this.flavor + '"';
    }
    noLoc() {        // day time player claim flavor 'At 10th bell on 12 December 1341, Hamlet investigated Claudius, saying: "Hmm, I don't like this."'
        return 'At ' + timeText(this.time) + ' on ' + this.day.toText() + ', ' + this.player.fullName() + ' ' + this.claim() + ', saying: "' + this.flavor + '"';
    }
    noPers() {      // day time location claim flavor 'At 10th bell on 12 December 1341, someone investigated Claudius in the throne room, saying: "Hmm, I don't like this."'
        return 'At ' + timeText(this.time) + ' on ' + this.day.toText() + ', someone ' + this.claim() + ' in ' + this.location.toText() + ', saying: "' + this.flavor + '"';
    }
    noAct() {       // day time location player flavor 'At 10th bell on 12 December 1341, Hamlet was heard in the throne room, saying: "Hmm, I don't like this."'
        return 'At ' + timeText(this.time) + ' on ' + this.day.toText() + ', ' + this.player.fullName() + ' was overheard in ' + this.location.toText() + ', saying: "' + this.flavor + '"';
    }
    noActCorr() {    // day time location player corruptedflavor 'At 10th bell on 12 December 1341, Hamlet was heard in the throne room, saying: "Hmm, *indistinct* don't *cough* this."'
        return 'At ' + timeText(this.time) + ' on ' + this.day.toText() + ', ' + this.player.fullName() + ' was overheard in ' + this.location.toText() + ', saying: "' + this.corruptedFlavor() + '"';
    }
    noTruth() {      // day time location player claim flavor 'At 10th bell on 12 December 1341, Hamlet investigated Claudius in the throne room, saying: "Hmm, I don't like this."'
        return 'At ' + timeText(this.time) + ' on ' + this.day.toText() + ', ' + this.player.fullName() + ' ' + this.claim() + ' in ' + this.location.toText() + ', saying: "' + this.flavor + '"';
    }
    noTruthCorr() {  // day time location player claim corruptedflavor 'At 10th bell on 12 December 1341, Hamlet investigated Claudius in the throne room, saying: "*indistinct*, I don't *cough* this."'
        return 'At ' + timeText(this.time) + ' on ' + this.day.toText() + ', ' + this.player.fullName() + ' ' + this.claim() + ' in ' + this.location.toText() + ', saying: "' + this.corruptedFlavor() + '"';
    }
    all() {          // day time location player truth lie flavor 'At 10th bell on 12 December 1341, Hamlet claimed they investigatied Claudius in the throne room, saying: "Hmm, I don't like this." However they were in fact voting nay on the current proposal.'
        return 'At ' + timeText(this.time) + ' on ' + this.day.toText() + ', ' + this.player.fullName() + ' claimed they ' + this.claim() + ' in ' + this.location.toText() + ', saying: "' + this.corruptedFlavor() + '". Truly, they ' + this.truth.toText();
    }
    claim() {        // returns a lie or a truth.
        return this.lie.toText();
    }
    corruptedFlavor() {
        //takes a piece of flavor and randomly replaces a number of the words with indistinct sounds
        return this.flavor;
    }
}

//CLASS: Actions
//[Visit the <Throne,Courtyard,Ballroom,Chapel,Barracks>]
class Visit {
    constructor(destination) {this.destination = destination; }
    toText() { return 'was seen walking' }
    flavor() { return "I think I'll check in on " + this.destination.toText();}
}
//[Investigate <Name>]
class Investigate {
    constructor(player) {this.player = player; }
    toText() { return 'investigated ' + this.player.fullName(); }
}
//[Thank <Crowns>]
//[Press <Crowns>]
//[Pay <Name> <Crowns>]
class Pay {
    constructor(player, crowns) {this.player = player; this.crowns = crowns;}
    toText() {return 'paid ' + this.player.fullName() + ' ' + crowns + ' crowns.';}
}
//[Propose <Crowns> Tax of <Faction>]
class Propose {
    constructor(crowns,location) {this.crowns = crowns; this.location = location;}
    toText() {return 'proposed a tax of ' + this.crowns + ' crowns upon ' + this.location.factionText();}
}
//[Vote <Yea,Nay>]
class Vote {
    constructor(vote) {this.vote = vote;}
    toText() {return "voted '" + vote + "' on the current proposal";}
}
//[Hear Petition from <Faction>]
class Hear {
    constructor(location) {this.location = location; this.petition = location.factionPetition();}
    toText() {return "heard a petition from " + this.location.factionText() + " to have " + this.petition.toText();}
}
//[Poison Food]
class Poison {
    constructor () {this.food = randomChoice(['caviar', 'steak', 'coq au vin', 'souffle', 'champagne', 'canapes', 'trifle'])}
    toText() {return "poisoned the " + this.food;}
}
//[Laud <Player>]
class Laud {
    constructor(player) {this.player = player;}
    toText() {return randomChoice(['sung the praises of', 'lauded', 'complimented']) + this.player.fullName();}
}
//[Besmirch <Player>]
class Besmirch {
    constructor(player) {this.player = player;}
    toText() {return randomChoice(['castigated', 'insulted', 'besmirched the name of']) + this.player.fullName();}
}
//[Pray]
class Pray {
    constructor() {}
    toText() {return randomChoice(['held a solemn vigil for the departed','prayed for the soul of the ghost','knelt in prayer']);}
}
//[Tithe <Crowns>]
class Tithe {
    constructor(crowns) {this.crowns = crowns;}
    toText() {return randomChoice(['made a discrete donation of ' + this.crowns + ' crowns','slipped ' + this.crowns + ' crowns into the pocket of the Bishop']);}
}
//[Buy a Round <Crowns>]
class Buy {
    constructor(crowns) {this.crowns = crowns;}
    toText() {return 'laid ' + this.crowns + ' crowns on the table to purchase a round for the Castle Guard.';}
}
//[Direct Attention <Location>]
class Direct {
    constructor(location) {this.location = location;}
    toText() {return 'suggested evidence might be found in ' + this.location.toText();}
}
//[Suspect <Name>]
class Suspect {
    constructor(player) {this.player = player;}
    toText() {return 'confided suspicions that ' + this.player.fullName() + ' might be the *murderer*.';}
}
//[Accuse <Name>]
class Accuse {
    constructor(player) {this.player = player;}
    toText() {return 'accused ' + this.player.fullName() + ' of being the *murderer*';}
}
//[Support <Name>]
class Support {
    constructor(player) {this.player = player;}
    toText() {return 'publicly supported ' + this.player.fullName() + "'s right to the throne";}
}
//[Claim Throne]
class Claim {
    constructor() {}
    toText() {return 'claimed the throne for themselves';}
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
                // old_game.exuent();
                // old_game.main_message.edit(old_game.exuentText());
                // delete old_game;
                console.log("ERROR: Should not start a new game while the old one is still available.");
                return;
            }
            var title = commandMatch(msg, 'the * is dead!') ? 'The ' + commandArgs(msg, 'the * is dead!')[0] : 'Their Majesty';
            title = title.split(' ');
            for (t in title) {
                title[t] = title[t].charAt(0).toUpperCase() + title[t].slice(1);
            }
            title = title.join(' ');
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
            let game = gamesByUser[message.author.id];
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
    //console.log(reaction);
    if (user.bot) {
        //console.log("Just a bot, nothing to see here!");
        return;
    }

    var game = gamesByChannel[reaction.message.channel.id];
    if (game != null && game.state == 'is beginning') {
        //console.log("LOG: Found Game!");
        if (reaction.message == game.main_message) {
            //console.log("LOG: Correct Game!");
            var player = game.getPlayer(user)
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
})

bot.on('messageReactionRemove', (reaction, user) => {
    //no way to check for bot

    var game = gamesByChannel[reaction.message.channel.id];
    if (game != null && game.state == 'is beginning') {
        //console.log("LOG: Found Game");
        if (reaction.message == game.main_message) {
            //console.log("LOG: Correct Game");
            var player = game.getPlayer(user)
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