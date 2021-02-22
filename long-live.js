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

//VARS: LOCATIONS -> FACTION -> ROLE relationships
var locationToFaction = {'Throne':'Spirit','Courtyard':'Common','Ballroom':'Noble','Chapel':'Faithful','Barracks':'Guard'};
var roleToLocation = {'Grim':'Throne','Heir':'Courtyard','Advisor':'Ballroom','Bishop':'Chapel','Captain':'Barracks'};
var roleToFaction = {'Grim':'Spirit','Heir':'Common','Advisor':'Noble','Bishop':'Faithful','Captain':'Guard'};

//VARS: GLOBAL TWEAK VARIABLES
const startingInfluence = 40;
const startingCrowns = 100;
const pressCost = 20;
const laudAmount = 20;
const laudBonus = 80;
const besmirchAmount = 10;
const besmirchPenalty = 80;
const titheRate = 0.5;

//HELPERS: Random Choice
function randomPop(array) {
    //const random = Math.random();
    //console.log("length: " + array.length + " random: " + random + " floored: " + Math.floor(random * array.length));
    const result = array.splice(Math.floor(Math.random() * array.length),1);
    return result;
}

function randomChoice(array) {
    return array.slice()[Math.floor(Math.random() * array.length)];
}

//HELPERS: Title Case
function titleCase(string) {
    title = string.split(' ');
    for (t in title) {
        title[t] = title[t].charAt(0).toUpperCase() + title[t].slice(1);
    }
    return title.join(' ');
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
        return null;
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
        this.players = []; this.ais = []; this.characters = [];
        this.state = 'is beginning';
        this.random_names = random_names.slice();
        this.day = new Day(0,this);
        this.throne = new Location('Throne',this); this.courtyard = new Location('Courtyard',this); this.ballroom = new Location('Ballroom',this);
        this.chapel = new Location('Chapel',this); this.barracks = new Location('Barracks',this);
        this.locations = [this.throne,this.courtyard,this.ballroom,this.chapel,this.barracks];
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
    //getPlayerByUser - returns the player corresponding to the discord user or null otherwise
    getPlayerByUser(user) {
        for (var i in this.players) {
            if (this.players[i].user == user) {
                return this.players[i]
            }
        }
        return null;
    }
    //getCharacterByName - returns the player corresponding to the name
    getCharacterByName(name) {
        for (var c in this.characters) {
            var character = this.characters[c];
            //console.log("LOG: Getting: " + character.name + ' typeOf: ' + typeof character.name);
            if (character.name.toString().toLowerCase() == name || character.fullName().toLowerCase() == name) {
                return character;
            }
        }
        return null;
    }
    //getLocationByName - returns the location corresponding to a name
    getLocationByName(name) {
        const lowerName = name.toLowerCase();
        for (var l in this.locations) {
            var location = this.locations[l];
            if (location.location.toLowerCase() == lowerName || location.toText().toLowerCase() == lowerName 
                || location.faction.toLowerCase() == lowerName || location.factionText().toLowerCase() == lowerName) {
                return location;
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
                case '👻': player.setRole('Grim'); this.roles['Grim'] = player; break;
                case '👑': player.setRole('Heir'); this.roles['Heir'] = player; break;
                case '🍷': player.setRole('Advisor'); this.roles['Advisor'] = player; break;
                case '⛪': player.setRole('Bishop'); this.roles['Bishop'] = player; break;
                case '⚔️': player.setRole('Captain'); this.roles['Captain'] = player; break;
                case '🎲': player.setRole('Mysterious'); this.roles['Mysterious'].push(player); break;
                case null: break;
                default: console.log("ERROR: Unknown Reaction: " + reaction._emoji.name); return;
            }
        } else {
            player.setRole(null);
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
                //add the player to the character list as well
                this.characters.push(this.players[i]);
            }
            //with the roles we have left and the players who need them identified, zip together.
            for (var m in mysteries) {
                var role = randomPop(rolesRemaining);
                mysteries[m].setRole(role);
                this.roles[role] = mysteries[m]
            }
            this.roles['Mysterious'] = [];

            //now we need to add ais to fill in whatever space is missing.
            for (var a = 0; a < 5 - this.players.length; a++) {
                const new_role = randomPop(rolesRemaining);
                var new_ai = new AI(this.randomName(), "Their Majesty", this, new_role);
                this.ais.push(new_ai); this.characters.push(new_ai);
            }

            for (var p in this.players) {
                //message all players to say the game is starting
                this.players[p].user.send("**" + this.title + " is Dead, Long Live ..." + this.players[p].fullName() + "?**\n*The throne lies empty... Perhaps it is yours for the taking... The game begins.*");
                
                //fabricate news for all players of their previous actions
                var player = this.players[p];
                let first_action = player.firstAction();
                player.location = player.home;
                let first_news = new News(this.day,1,player.location,player,first_action,first_action,first_action.flavor());
                this.day.news.push(first_news);
            }
            this.nextDay();
            return true;
        }
    }
    //nextDay - advances the day, sends out news to everyone
    nextDay() {
        for (var p in this.players) {
            if (!this.players[p].next) { console.log("LOG: Tried to advance day from " + this.day.day + " when player " + this.players[p].name + " is " + this.players[p].next); return;}
        }// after this point, we know that all players are ready. Now, we need to fetch AI events

        for (var a in this.ais) {
            var ai = this.ais[a];
            var timeLeft = true;
            while (timeLeft) {
                let action = ai.randomAction();
                //console.log("LOG: Looping - make sure does not break! AI: " + ai.name + ", Action: " + action);
                if (action.type == 'end') {timeLeft = false;}
                let news = new News(this.day,ai.time,ai.location,ai,action,action,action.flavor());
                this.day.news.push(news);
                ai.execute(action);
            }
            ai.time = 3;
        }//all ai events should be in place now
        for (var i in this.players) {
            var player = this.players[i];
            player.next = false;
            player.time = 3;
            var newsTexts = player.getRelevantNewsTexts(this.day.news);
            var message = '** NEWS ** *Whispers filter in at 10th bell about the movements of others the previous day...*\n-' + 
            newsTexts.join('\n-');
            player.user.send(message);
        }
        this.day = this.day.nextDay();
    }
    //newAction - parses a player's message into actions and returns a response, else returns null if the command is invalid
    newAction(player, truth, lie, flavor) {
        //need to get an action object
        console.log("LOG: Instantiating: " + player.name + " [" + truth + " | " + lie + "] " + '"' + flavor + '"');
        if (true == null || lie == null) { console.log("LOG: Invalid action instantiation: " + truth); return null; }
        var trueAction = newAction(this,truth,player);
        if (trueAction == null) { console.log("LOG: Invalid action instantiation: " + truth); return null; }
        var lieAction = truth != lie ? newAction(this,lie,player) : trueAction;
        if (lieAction == null) { console.log("LOG: Invalid action instantiation: " + lie); return null; }

        //run the actual affect of the action on the game
        //pass the action on to the player so they can use it to affect their currencies/check validity
        const valid = player.execute(trueAction);   //UNTESTED
        if (!valid) { console.log("LOG: Invalid action for player " + player.user.username + " to  perform: " + trueAction.toText()); return null; }

        //insert news of the action
        var news = new News(this.day, player.time, player.location, player, trueAction, lieAction, flavor);
        console.log("Created " + valid + " news: " + news.all());
        this.day.news.push(news);

        //resend the update text (TEMPORARY)
        player.user.send(player.stateText());

        //and construct an appropriate response
        return trueAction.response(player);
    }
    //newProposal - creates a proposal within the game.
    newProposal(action,character) {
        if (action.type != 'propose') {console.log('ERROR: Not a proposal action.'); return false;}
        if (this.proposal != null) {console.log('ERROR: Proposal already in place.'); return false;}
        this.proposal = new Proposal(action.crowns,action.location,this,character,this.day.day + 2);
    }
    //addVote - adds a vote to the current proposal.
    addVote(vote,character) {
        if (this.proposal != null) {
            const valid = this.proposal.addVote(vote,character);
            return valid;
        } else {
            return false;
        }
    }
}

//CLASS: Day, a class representing a day
class Day {
    constructor(day, game) {
        this.day = day; this.game = game;
        this.news = [];
    }
    nextDay() {
        var nextDay = new Day(this.day + 1, this.game);
        nextDay.previousDay = this;
        this.previousDay = null;
        return nextDay;
    }
    toText() {
        if (this.day == 0) { return 'the 1st of October'; } else
        if (this.day == 1) { return 'the 2nd of October'; } else 
        if (this.day == 2) { return 'the 3rd of October'; } 
        else { return 'the ' + (this.day+1) + 'th of Oct.'; }
    }
    //investigateText - returns the result of a player investigating another player in their current location
    investigateText(investigator, investigated) {
        var investigationTexts = [];
        for (var n in this.news) {
            var news = this.news[n];
            if (news.location == investigator.location && news.player == investigated) {
                investigationTexts.push(news.all());
            }
        }
        if (investigationTexts.length == 0) {
            return '**' + investigator.location.randomPerson() + ".** I don't know what to tell you, " + investigator.fullName() + ". I didn't see them!";
        } else {
            return '**' + investigator.location.randomPerson() + '.** Look, this is all I can tell you:\n' + investigationTexts.join('\n');
        }
    }
}

//HELPER: Time int to text
//10-11 11-12 12-13 13-14 14-15 15-16 16-17 17-18 18-19 19-20 20-21 21-22
function timeText(time) { //time represent 'number of hours left before 22nd bell'
    //console.log(time);
    // if (time == 1) {
    //     return '21st bell';
    // } else if (time == 0) {
    //     return '22nd bell';
    // } else {
    //     return String(22 - time) + 'th bell';
    // }
    switch (time) {
        case 3: return "Morning";
        case 2: return "Afternoon";
        case 1: return "Evening";
        case 0: return "Night"
        default: return "ERROR: TIME OUT OF BOUNDS"
    }
}

//CLASS: Location, a class representing a part of the castle
class Location {
    constructor(location, game) {
        this.game = game;
        if (location == 'Throne' || location == 'Courtyard' || location == 'Ballroom' || location == 'Chapel' || location == 'Barracks') {
            this.location = location;
        } else {
            console.log("ERROR: NON-STANDARD LOCATION - TRACE");
            this.location = 'Courtyard';
        }
        this.faction = locationToFaction[this.location];
    }
    toText() {
        return 'the **' + this.location + '**';
    }
    factionText() {
        switch (this.location) {
            case 'Throne': return '**Castle Spirits**';
            case 'Courtyard': return '**Common Folk**';
            case 'Ballroom': return '**High Nobility**';
            case 'Chapel': return '**Faithful Flock**';
            case 'Barracks': return '**Castle Guards**';
        }
    }
    servant() {
        switch (this.location) {
            case 'Throne': return 'clerk';
            case 'Courtyard': return 'citizen';
            case 'Ballroom': return 'noble';
            case 'Chapel': return 'clergyperson';
            case 'Barracks': return 'guard';
        }
    }
    //randomPerson - returns a random named person who resides in the location
    randomPerson() {
        switch (this.location) {
            case 'Throne': return randomChoice(['The Dutiful Sergeant','The Stern Chamberlain','The Stern Chamberlain']);
            case 'Courtyard': return randomChoice(['The Whistling Luthier','The Earnest Cobbler', 'The Tired Farmer']);
            case 'Ballroom': return randomChoice(['The Shallow Sycophant','The Curious Nobleperson','The Unfortunate Connoisseur']);
            case 'Chapel': return randomChoice(['The Pontificating Priest','The Nervous Novice','The Whispering Devotee']);
            case 'Barracks': return randomChoice(['The Raucous Sentry','The Dutiful Sergeant','The Cold Lieutenant']);
        }
    }
    //visitText - response to player when they arrive
    visitText(player) {
        switch (this.location) {
            case 'Throne': return '**The Dutiful Sergeant.** Welcome to the Throne Room, ' + player.role + '. What brings you here today?';
            case 'Courtyard': return '**The Whistling Luthier.** Careful not to get muck on your shoes, ' + player.role + '! Care for a song, to pass the day?';
            case 'Ballroom': return '**The Shallow Sycophant.** Oh, ' + player.role + ', we were just hoping you\'d show up today! Come, join us for a drink?';
            case 'Chapel': return '**The Pontificating Priest.** You have interrupted my sermon, ' + player.role + '. Please, take a seat so I may continue from the beginning.';
            case 'Barracks': return '**The Raucous Sentry.** All quiet here, ' + player.role + '! Have you heard any news about the Murderer?';
        }
    }
    //thankText - response to a player thanking them
    thankText(crowns) {
        return '***The ' + this.servant() + '** accepts your offer of crowns gratefully, and leaves eager to share your interest in their news with others.*'
    }
    //pressText - response to a player pressing them
    pressText(crowns,player) {
        return '***The ' + this.servant() + '** nervously looks around before accepting your offer of crowns, saying:* ' + player.game.day.previousDay.press(player);
    }
    //proposalAngerText - reponse to a proposal against them
    proposalAngerText() {
        switch (this.location) {
            case 'Courtyard': return '**The Earnest Cobbler.** The people won\'t stand for much more of this. Times are hard enough already. Just... remember who does all the work around here, right?';
            case 'Ballroom': return '**The Curious Nobleperson.** I wonder, what do you hope to achieve here? Angering your staunchest supporters? I can see you regard our favor as guaranteed - I assure you, it is not.';
            case 'Chapel': return '**The Nervous Novice.** W-we are disappointed that you consider the benediction we offer as requiring payment in return! But if the kingdom wills it, of c-course we will comply.';
            case 'Barracks': return '**The Cold Lieutenant.** With the funding constantly cut like this, it\'s no wonder ' + this.game.title + ' was killed. I hope you realize what you\'re risking.';
        }
    }
    //factionPetition - creates a petition for the faction to submit to the character
    factionPetition(character) {
        switch (this.location) {
            //case 'Throne': return new Petition(this,new ,player,randomChoice([2,3,4]))
            case 'Courtyard': return new Petition(this,new Propose(randomChoice([100,200,300]),this.game.ballroom),character,randomChoice([2,3,4]));
            case 'Ballroom': return new Petition(this,new Propose(randomChoice([200,300,400]),this.game.courtyard),character,randomChoice([2,3,4]));
            case 'Chapel': return new Petition(this,new Pray(),character,randomChoice([2,3,4]));
            case 'Barracks': return new Petition(this,new Bribe(randomChoice([20,40,60])),character,randomChoice([2,3,4]));
        }
    }
}

//CLASS: Player, a class representing a player in a game
class Player {
    //constructor - when a player joins a game
    constructor(user, name, title, game) {
        this.user = user; this.name = name; this.title = title; this.game = game;
        this.influence = {common:0,noble:0,faithful:0,guard:0};
        this.crowns = startingCrowns; this.time = 0; this.next = true;
    }
    //mainText - formatting whatever information about a player is available into something suitable for the main text
    mainText() {
        return this.user.username + " *as* " + this.fullName();
    }
    //fullName - role and name together.
    fullName() {
        if (this.role != null) {
            return '**' + this.role + " " + this.name + '**';
        } else {
            return '**' + this.name + '**';
        }
    }
    //stateText - formats the various currencies etc. into a piece of update text.
    stateText() {
        return "It is " + timeText(this.time) + " on the " + this.game.day.toText() + 
        ". You are in " + this.location.toText() + ". You have " + this.crowns + " crowns." + 
        "You have " + this.influence.common + " Common Influence, " + this.influence.noble + " Noble Influence, " +
        this.influence.faithful + " Faithful Influence, and " + this.influence.guard + " Guard Influence.";
    }
    //setRole - gives this player a role
    setRole(role) {
        this.role = role.toString();
        this.home = this.game.getLocationByName(roleToLocation[role]);
        this.location = this.home;
        this.influence[this.home.faction.toLowerCase()] = startingInfluence;
        if (this.role.toLowerCase() == 'bishop') {
            this.influence.faithful = startingInfluence * 2;
        }
    }
    firstAction() {
        return new End(this.time);
    }
    getRelevantNewsTexts(news) {
        var texts = [];
        for (var n in news) {
            if (news[n].player != this && news[n].lie.type != 'visit') {
                texts.push(news[n].noTruth());
            }
        }
        return texts.slice(0,10);
    }
    //execute - executes the action's effect on the player. returns whether the action was valid or not.
    execute(action) {
        if (this.time >= action.time) {
            //we have enough time remaining
            if (action.origin == 'any' || action.origin == this.location) {
                //we are in the right place
                const valid = action.execute(this)
                if (valid) {
                    //the action executed, can update time
                    this.time -= action.time;
                    return true;
                } else { console.log("FAILED ACTION: " + action.type + ", " + valid); return false; }
            } else { console.log("WRONG LOCATION: HAVE " + this.location + " NEEDS: " + action.origin); return false; }
        } else { console.log("NOT ENOUGH TIME REMAINING: HAVE " + this.time + " NEEDS: " + action.time); return false; }
    }
}

class AI { //similar API to player
    //constructor: when a game starts without all five players
    constructor(name, title, game, role) {
        this.name = name; this.title = title; this.game = game; this.role = role.toString(); this.home = game.getLocationByName(roleToLocation[role]);
        this.location = this.home;
        this.influence = {common:0,noble:0,faithful:0,guard:0};
        this.influence[roleToFaction[role].toLowerCase()] = startingInfluence;
        //console.log("LOWERCASE TEST: " + role);
        if (this.role.toLowerCase() == 'bishop') {
            this.influence.faithful = startingInfluence * 2;
        }
        this.crowns = startingCrowns; this.time = 0;
    }
    //mainText - rendering for the playbill
    mainText() {
        return 'Long-Live *as* ' + this.fullName();
    }
    //fullName - combination of role and name
    fullName() {
        if (this.role != null) {
            return '**' + this.role + ' ' + this.name + '**';
        } else {
            return '**' + this.name + '**';
        }
    }
    //firstAction - action undertaken on the first day
    firstAction() {
       return new Visit(this.home);
    }
    //randomAction - returns a random viable action based on role and location
    randomAction() {
        var action;
        const role = this.role.toLowerCase();
        switch (this.location.location.toLowerCase()) {
            case 'throne': 
            if (role == 'advisor' && randomChoice([0,1,1]) == 1) {
                action = new Propose(randomChoice([100,150,200,300]),randomChoice([this.game.courtyard,this.game.chapel,this.game.barracks]));
            } break;
            case 'courtyard': break;
            case 'ballroom': 
            if (role != 'captain' && role != 'grim' && randomChoice([0,1,1]) == 1) {
                action = new Laud(randomChoice(this.game.characters));
            } break;
            case 'chapel':
            if (role != 'captain' && randomChoice([0,1,1]) == 1) {
                action = new Pray();
            } break;
            case 'barracks': break;
        }
        if (action == null) {
            action = randomChoice([0,0,1]) == 1 ? this.randomVisit() : new Investigate(randomChoice(this.game.characters));
        }
        if (action.time <= this.time) {
            return action;
        } else {
            return new End(this.time);
        }
    }
    //execute - runs the effect of an action
    execute(action) {
        if (this.time >= action.time) {
            //we have enough time remaining
            if (action.origin == 'any' || action.origin == this.location) {
                //we are in the right place
                const valid = action.execute(this)
                if (valid) {
                    //the action executed, can update time
                    this.time -= action.time;
                    return true;
                } else { console.log("FAILED ACTION: " + action.type + ", " + valid); return false; }
            } else { console.log("WRONG LOCATION: HAVE " + this.location + " NEEDS: " + action.origin); return false; }
        } else { console.log("NOT ENOUGH TIME REMAINING: HAVE " + this.time + " NEEDS: " + action.time); return false; }
    }

    //randomVisit - produces a visit action targetting some non-here place.
    randomVisit() {
        switch (this.location.location.toLowerCase()) {
            case 'throne': return new Visit(randomChoice([this.game.courtyard,this.game.ballroom,this.game.chapel,this.game.barracks]));
            case 'courtyard': return new Visit(randomChoice([this.game.throne,this.game.ballroom,this.game.chapel,this.game.barracks]));
            case 'ballroom': return new Visit(randomChoice([this.game.throne,this.game.courtyard,this.game.chapel,this.game.barracks]));
            case 'chapel': return new Visit(randomChoice([this.game.throne,this.game.courtyard,this.game.ballroom,this.game.barracks]));
            case 'barracks': return new Visit(randomChoice([this.game.throne,this.game.courtyard,this.game.ballroom,this.game.chapel]));
        }
    }
    //getRelevantNewsTexts - doesn't really need to be implemented as nothing is ever sent to them.
    getRelevantNewsTexts(news) {
        //error?
        console.log("ERROR: Should not try to send a bot any news!");
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
        return 'Sometime on ' + this.day.toText() + ', ' + this.player.fullName() + ' ' + this.claim() + ' in ' + this.location.toText() + this.maybeFlavor();
    }
    noLoc() {        // day time player claim flavor 'At 10th bell on 12 December 1341, Hamlet investigated Claudius, saying: "Hmm, I don't like this."'
        return 'The ' + timeText(this.time) + ' of ' + this.day.toText() + ', ' + this.player.fullName() + ' ' + this.claim() + this.maybeFlavor();
    }
    noPers() {      // day time location claim flavor 'At 10th bell on 12 December 1341, someone investigated Claudius in the throne room, saying: "Hmm, I don't like this."'
        return 'The ' + timeText(this.time) + ' of ' + this.day.toText() + ', someone ' + this.claim() + ' in ' + this.location.toText() + this.maybeFlavor();
    }
    noAct() {       // day time location player flavor 'At 10th bell on 12 December 1341, Hamlet was heard in the throne room, saying: "Hmm, I don't like this."'
        return 'The ' + timeText(this.time) + ' of ' + this.day.toText() + ', ' + this.player.fullName() + ' was overheard in ' + this.location.toText() + this.maybeFlavor();
    }
    noActCorr() {    // day time location player corruptedflavor 'At 10th bell on 12 December 1341, Hamlet was heard in the throne room, saying: "Hmm, *indistinct* don't *cough* this."'
        return 'The ' + timeText(this.time) + ' of ' + this.day.toText() + ', ' + this.player.fullName() + ' was overheard in ' + this.location.toText() + this.corruptedFlavor();
    }
    noTruth() {      // day time location player claim flavor 'At 10th bell on 12 December 1341, Hamlet investigated Claudius in the throne room, saying: "Hmm, I don't like this."'
        return 'The ' + timeText(this.time) + ' of ' + this.day.toText() + ', ' + this.player.fullName() + ' ' + this.claim() + ' in ' + this.location.toText() + this.maybeFlavor();
    }
    noTruthCorr() {  // day time location player claim corruptedflavor 'At 10th bell on 12 December 1341, Hamlet investigated Claudius in the throne room, saying: "*indistinct*, I don't *cough* this."'
        return 'The ' + timeText(this.time) + ' of ' + this.day.toText() + ', ' + this.player.fullName() + ' ' + this.claim() + ' in ' + this.location.toText() + this.corruptedFlavor();
    }
    all() {          // day time location player truth lie flavor 'At 10th bell on 12 December 1341, Hamlet claimed they investigatied Claudius in the throne room, saying: "Hmm, I don't like this." However they were in fact voting nay on the current proposal.'
        return 'The ' + timeText(this.time) + ' of ' + this.day.toText() + ', ' + this.player.fullName() + ' claimed they ' + this.claim() + ' in ' + this.location.toText() + this.maybeFlavor() + ' ' + this.confirmation();
    }
    claim() {        // returns a lie or a truth.
        return this.lie.toText();
    }
    confirmation() {
        if (this.lie == this.truth) {
            return "I can confirm this as true."
        } else {
            return "But that was merely a rumor. In fact, they " + this.truth.toText() + ' in ' + this.location.toText() + ' instead.';
        }
    }
    corruptedFlavor() {
        //takes a piece of flavor and randomly replaces a number of the words with indistinct sounds
        return this.maybeFlavor();
    }
    //if the flavor is set, return the flavor, but if it isn't don't include it. True for all examples.
    maybeFlavor() {
        if (this.flavor != null) {
            return ', saying: "' + this.flavor + '".';
        } else { return '.'; }
    }
}

//HELPER: newAction - creates an action out of action text
function newAction(game,actionText,character) {
    const text = '[' + actionText.toLowerCase() + ']'
    if (commandMatch(text,'[visit *]')) {
        const destText = commandArgs(text,'[visit *]')[0];
        var destination = game.getLocationByName(destText);
        if (destination == null) { console.log("ERROR: '" + destText + "' is not a location!"); return null; }
        return new Visit(destination);
    } else if (commandMatch(text, '[investigate *]')) {
        const playerName = commandArgs(text, '[investigate *]')[0];
        var player = game.getCharacterByName(playerName);
        if (player == null) { console.log("ERROR: '" + playerName + "' is not a player!"); return null; }
        return new Investigate(player);
    } else if (commandMatch(text, '[thank *]')) {
        const crowns = commandArgs(text, '[thank *]')[0];
        if (isNaN(crowns)) { console.log("ERROR: '" + crowns + "' is not a number!"); return null; }
        return new Thank(crowns);
    } else if (commandMatch(text, '[press *]')) {
        const crowns = commandArgs(text, '[press *]')[0];
        if (isNaN(crowns)) { console.log("ERROR: '" + crowns + "' is not a number!"); return null; }
        return new Press(crowns);
    } else if (commandMatch(text, '[pay * to *]')) {
        var args = commandArgs(text, '[pay * to *]');
        const crowns = args[0]; const playerName = args[1];
        var player = game.getCharacterByName(playerName);
        if (player == null) { console.log("ERROR: '" + playerName + "' is not a player!"); return null; }
        if (isNaN(crowns)) { console.log("ERROR: '" + crowns + "' is not a number!"); return null; }
        return new Pay(crowns,player);
    } else if (text == '[end day]') {
        return new End(character.time);
    } else if (commandMatch(text, '[propose * tax of *]')) {
        var args = commandArgs(text, '[propose * tax of *]');
        const crowns = args[0]; const locText = args[1];
        var location = game.getLocationByName(locText);
        if (location == null) { console.log("ERROR: '" + locText + "' is not a location!"); return null; }
        if (isNaN(crowns)) { console.log("ERROR: '" + crowns + "' is not a number!"); return null; }
        return new Propose(crowns,location);
    } else if (text == '[vote yea]' || text == '[vote nay]') {
        const vote = commandArgs(text, '[vote *]')[0];
        return new Vote(vote);
    } else if (commandMatch(text, '[hear petition from *]')) {
        const locText = commandArgs(text, '[hear petition from *]')[0];
        var location = game.getLocationByName(locText);
        if (location == null) { console.log("ERROR: '" + locText + "' is not a location!"); return null; }
        return new Hear(location,character);
    } else if (text == '[poison food]') {
        return new Poison();
    } else if (commandMatch(text, '[laud *]')) {
        const playerName = commandArgs(text, '[laud *]')[0];
        var player = game.getCharacterByName(playerName);
        if (player == null) { console.log("ERROR: '" + playerName + "' is not a player!"); return null; }
        return new Laud(player);
    } else if (commandMatch(text, '[besmirch *]')) {
        const playerName = commandArgs(text, '[besmirch *]')[0];
        var player = game.getCharacterByName(playerName);
        if (player == null) { console.log("ERROR: '" + playerName + "' is not a player!"); return null; }
        return new Besmirch(player);
    } else if (text == '[pray]') {
        return new Pray();
    } else if (commandMatch(text, '[tithe *]')) {
        const crowns = commandArgs(text, '[tithe *]')[0];
        if (isNaN(crowns)) { console.log("ERROR: '" + crowns + "' is not a number!"); return null; }
        return new Tithe(crowns);
    } else if (commandMatch(text, '[bribe *]')) {
        const crowns = commandArgs(text, '[bribe *]')[0];
        if (isNaN(crowns)) { console.log("ERROR: '" + crowns + "' is not a number!"); return null; }
        return new Bribe(crowns);
    } else if (commandMatch(text, '[direct attention at *]')) {
        const locText = commandArgs(text, '[direct attention at *]')[0];
        var location = game.getLocationByName(locText);
        if (location == null) { console.log("ERROR: '" + locText + "' is not a location!"); return null; }
        return new Direct(location);
    } else if (commandMatch(text, '[suspect *]')) {
        const playerName = commandArgs(text, '[suspect *]')[0];
        var player = game.getCharacterByName(playerName);
        if (player == null) { console.log("ERROR: '" + playerName + "' is not a player!"); return null; }
        return new Suspect(player);
    } else if (commandMatch(text, '[accuse *]')) {
        const playerName = commandArgs(text, '[accuse *]')[0];
        var player = game.getCharacterByName(playerName);
        if (player == null) { console.log("ERROR: '" + playerName + "' is not a player!"); return null; }
        return new Accuse(player);
    } else if (commandMatch(text, '[support *]')) {
        const characterName = commandArgs(text, '[support *]')[0];
        var character = game.getCharacterByName(characterName);
        if (character == null) { console.log("ERROR: '" + characterName + "' is not a player!"); return null; }
        return new Support(character);
    } else if (text == '[claim throne]') {
        return new Claim();
    } else {
        console.log("UNKNOWN COMMAND: " + text);
        return null;
    }
}

//CLASS: Actions - 
//[Visit the <Throne,Courtyard,Ballroom,Chapel,Barracks>]
class Visit {
    constructor(destination) {this.type = 'visit'; this.destination = destination; this.time = 0; this.origin = 'any'; }
    toText() { return 'headed to ' + this.destination.toText() + " from where they were"; }
    flavor() { return "I think I'll check in on the " + this.destination.factionText();}
    execute(character) { character.location = this.destination; return true;}
    response(player) {
        return '*The ' + titleCase(this.destination.factionText()) + ' welcome you to ' + this.destination.toText() + '*\n' + this.destination.visitText(player);
    }
}
//[Investigate <Name>]
class Investigate {
    constructor(character) {this.type = 'investigate'; this.character = character; this.time = 1; this.origin = 'any'; }
    toText() { return 'investigated ' + this.character.fullName(); }
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) { 
        if (character.user != null) {
            character.user.send("*You learn lots of interesting secrets..* (UNIMPLEMENTED: Thank, Press, Generally Investigating)"); 
        }
        return true;
    }
    response(player) {
        return player.game.day.previousDay.investigateText(player, this.character, 0);
    }
}
//[Thank <Crowns>]
class Thank {
    constructor(crowns) {this.type = 'thank'; this.crowns = crowns; this.time = 0; this.origin = 'any'; }
    toText() { return 'thanked them with a gift of ' + this.crowns + ' crowns'; }
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) { 
        character.crowns -= this.crowns;
        if (character.user != null) {
            character.user.send("*You realize that gratitude is ~not implemented~ actually illegal right now* (UNIMPLEMENTED)");
        }
        return true;
    }
    response(player) {
        return player.location.thankText(this.crowns);
    }
}
//[Press <Crowns>]
class Press {
    constructor(crowns) {this.type = 'press'; this.crowns = crowns; this.time = 0; this.origin = 'any'; }
    toText() { return 'pressed them for further information, offering ' + this.crowns + ' crowns if they would divulge further'; }
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) { 
        character.crowns -= this.crowns;
        if (character.user != null) {
            character.user.send("*You realize that threatening is ~not implemented~ actually illegal right now* (UNIMPLEMENTED)");
        }
        return true;
    }
    response(player) {
        return player.location.pressText(this.crowns,player);
    }
}
//[Pay <Name> <Crowns>]
class Pay {
    constructor(crowns, character) {this.type = 'pay'; this.character = character; this.crowns = crowns; this.time = 0; this.origin = 'any'; }
    toText() {return 'paid ' + this.character.fullName() + ' ' + this.crowns + ' crowns.';}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        character.crowns -= this.crowns;
        return true;
    }
    response(player) {
        return '***The ' + player.location.servant() + '** agrees to carry your message to **' + this.character.fullName() + '**.*';
    }
}
//[End Day]
class End {
    constructor(time) {this.type = 'end'; this.time = time; this.origin = 'any'; }
    toText() {return this.time == 0 ? 'turned in for bed at the end of the day' : 'spent the rest of the day accounting to personal business';}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        character.next = true;
        character.location = character.home;
        return true;
    }
    response(player) {
        var first; var remaining;
        if (player.location != player.home) {
            first = '*You return to ' + player.home.toText() + ', ';
        } else {
            first = '*You remain in your private chambers, ';
        }
        if (this.time == 0) {
            remaining = 'and lay down to rest.';
        } else {
            remaining = 'and pass the ' + this.time + ' hours before the candles burn low in contemplation of the day to come.';
        }
        return first + remaining;
    }

}
//[Propose <Crowns> Tax of <Faction>]
class Propose {
    constructor(crowns,location) {this.type = 'propose'; this.crowns = crowns; this.location = location; this.time = 1; this.origin = 'throne';}
    toText() {return 'proposed a tax of **' + this.crowns + '** crowns upon the **' + this.location.factionText() + '**';}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return character.game.newProposal(character,this);
    }
    response(player) {
        return '*Your tax of **' + this.crowns + '** crowns was proposed. The **' + this.location.factionText() + '** will not be pleased...*\n' + this.location.proposalAngerText();
    }
}
//[Vote <Yea,Nay>]
class Vote {
    constructor(vote) {this.type = 'vote'; this.vote = vote; this.time = 1; this.origin = 'throne';}
    toText() {return "voted **'" + vote + "'** on the current proposal";}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return character.game.currentProposal.addVote(character,this.vote);
    }
    response(player) {
        return "*Your **'" + this.vote + "'** vote was officially registered with the chamberlain.*\n**The Chamberlain.** Thank you for your vote, " + player.role + ".";
    }
}
//[Hear Petition from <Faction>]
class Hear {
    constructor(location,character) {this.type = 'hear'; this.location = location; this.petition = location.factionPetition(character); this.time = 1; this.origin = 'throne';}
    toText() {return "heard a petition from the **" + this.location.factionText() + "** to have " + this.petition.action.toText();}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return character.game.newPetition(character,this);
    }
    response(player) {
        return this.petition.fullText(player);
    }
}
//[Poison Food]
class Poison {
    constructor () {this.type = 'poison'; this.food = randomChoice(['caviar', 'steak', 'coq au vin', 'souffle', 'champagne', 'trifle']); this.time = 1; this.origin = 'ballroom';}
    toText() {return "poisoned the " + this.food;}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return character.game.poisonFood(this);
    }
    response(player) {
        return '*You tip the sinister alchemical concoction into the ' + this.food + ' where it disappears, leaving a lingering odour of treachery.*\n\
        **The Unfortunate Connoisseur.** I say, you all simply *must* try the ' + this.food + ", it's divine!";
    }
}
//[Laud <Player>]
class Laud {
    constructor(character) {this.type = 'laud'; this.character = character; this.time = 1; this.origin = 'ballroom';}
    toText() {return randomChoice(['sung the praises of ', 'lauded ', 'complimented ']) + this.character.fullName();}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return character.game.laud(character,this);
    }
    response(player) {
        return "**The Shallow Sycophant.** *I've* certainly always thought so. You're so discerning, " + player.fullName() + "! ...May I call you " + player.name + "?";
    }
}
//[Besmirch <Player>]
class Besmirch {
    constructor(character) {this.type = 'besmirch'; this.character = character; this.time = 1; this.origin = 'ballroom';}
    toText() {return randomChoice(['castigated ', 'insulted ', 'besmirched the name of ']) + this.character.fullName();}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return character.game.besmirch(character,this);
    }
    response(player) {
        return "**The Curious Nobleperson.** Really? Oh, why that's *ghastly*!";
    }
}
//[Pray]
class Pray {
    constructor() {this.type = 'pray'; this.time = 3; this.origin = 'chapel';}
    toText() {return randomChoice(['held a solemn vigil for the departed','prayed for the soul of the ghost','knelt in prayer']);}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return true;
    }
    response(player) {
        return "*The sun shines through the stained glass. The wind howls - or are those voices? You arise hours later, having received indeterminate comfort. \nYour knees hurt.*";
    }
}
//[Tithe <Crowns>]
class Tithe {
    constructor(crowns) {this.type = 'tithe'; this.crowns = crowns; this.time = 1; this.origin = 'chapel';}
    toText() {return randomChoice(['made a discrete donation of ' + this.crowns + ' crowns','slipped ' + this.crowns + ' crowns into the pocket of the Bishop']);}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        character.crowns -= this.crowns;
        return true;
    }
    response(player) {
        return "**The Nervous Novice.** \**stammering*\* W-why, thank you, " + player.fullName() + "! For distribution to the poor, of course - how kind! How generous!"
    }
}
//[Bribe <Crowns>]
class Bribe {
    constructor(crowns) {this.type = 'bribe'; this.crowns = crowns; this.time = 1; this.origin = 'barracks';}
    toText() {return 'laid ' + this.crowns + ' crowns on the table to purchase a round of drinks for the Castle Guard.';}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        character.crowns -= this.crowns;
        return true;
    }
    response(player) {
        //QUESTION should they have a different response depending on the amount?
        return "**The Raucous Sentry.** *cheering* Much obliged, " + player.fullName() + ". This'll keep us in the cups for a while yet!";
    }
}
//[Direct Attention <Location>]
class Direct {
    constructor(location) {this.type = 'direct'; this.location = location; this.time = 1; this.origin = 'barracks';}
    toText() {return 'suggested evidence might be found in ' + this.location.toText();}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return character.game.direct(character,this);
    }
    response(player) {
        return "**The Dutiful Sergeant.** " + titleCase(this.location.toText()) + ", you say? Well, we'll go give it a look-over tomorrow. Perhaps we'll turn up the bloody dagger after all!";
    }
}
//[Suspect <Name>]
class Suspect {
    constructor(character) {this.type = 'suspect'; this.character = character; this.time = 2; this.origin = 'barracks';}
    toText() {return 'confided suspicions that ' + this.character.fullName() + ' might be the *murderer*.';}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return character.game.suspect(character,this);
    }
    response(player) {
        return "**The Cold Lieutenant.** That's a very serious accusation, " + player.fullName() + ". We'll bring " + this.character.fullName() + " in for questioning first thing tomorrow.";
    }
}
//[Accuse <Name>]
class Accuse {
    constructor(character) {this.type = 'accuse'; this.character = character; this.time = 3; this.origin = 'barracks';}
    toText() {return 'accused ' + this.character.fullName() + ' of being the *murderer*';}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return character.game.accuse(character,this);
    }
    response(player) {
        return '*The crowd stills as your accusation of **' + this.character.fullName() + '** rings out across the courtyard. Ripples begin to spread. The people begin to chant **"Justice For ' + player.game.title + '!"***';
    }
}
//[Support <Name>]
class Support {
    constructor(character) {this.type = 'support'; this.character = character; this.time = 1; this.origin = 'courtyard';}
    toText() {return 'publicly supported ' + this.character.fullName() + "'s right to the throne";}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return character.game.support(character,this)
    }
    response(player) {
        return '*The crowd acknowledges your public declaration of support for **' + this.character.fullName() + '**.*';
    }
}
//[Claim Throne]
class Claim {
    constructor() {this.type = 'claim'; this.time = 3; this.origin = 'courtyard';}
    toText() {return 'claimed the throne';}
    flavor() { return "FLAVOR: " + this.type;}
    execute(character) {
        return character.game.claim(character,this)
    }
    response(player) {
        return '*The sudden Quiet is Deafening. Even the Winds pause their Howling for a Moment, as if to say that even the Elements shall bear Silent Witness to this moment.*'
    }
}

//CLASS: Proposal - represents a proposal in the kingdom
class Proposal {
    constructor(crowns,location,game,proposer,deadline) {
        this.crowns = crowns; this.location = location; this.game = game; this.proposer = proposer; this.deadline = deadline;
        this.votes = {yea:[],nay:[]};
    }
    addVote(vote,character) {
        console.log("LOG: Adding Character "+ character + "'s Vote: " + vote);
        if (!this.hasVoted(character)) {
            this.votes[vote].push(character);
            return true;
        } else {
            return false;
        }
    }
    hasVoted(character) {
        for (var y in this.votes.yea) {
            if (this.votes.yea[y] == character) { console.log("ERROR: Character " + character.name + " has already voted 'Yea'!"); return true; }
        }
        for (var n in this.votes.nay) {
            if (this.votes.nay[n] == character) { console.log("ERROR: Character " + character.name + " has already voted 'Nay'!"); return true; }
        }
        return false;
    }
}

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
            title = titleCase(title);
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
                    //then the action was successful
                    message.channel.send(response);
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
})

bot.on('messageReactionRemove', (reaction, user) => {
    //no way to check for bot

    var game = gamesByChannel[reaction.message.channel.id];
    if (game != null && game.state == 'is beginning') {
        //console.log("LOG: Found Game");
        if (reaction.message == game.main_message) {
            //console.log("LOG: Correct Game");
            var player = game.getPlayerByUser(user)
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