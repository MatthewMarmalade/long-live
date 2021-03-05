//VARS: HELP TEXT
exports.main_help_text = "\
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
exports.player_help_text = "NOT IMPLEMENTED?";

//VARS & HELPERS: NEW GAME TEXT
const playbill_title = (title) => "**" + title + " Is Dead! Long Live ...?**\n";
const playbill_tagline = (state) => "*A new game of text-based intrigue and betrayal " + state + ".*\n";
const playbill_players = (players) => "Players (" + players.length + "/5): \n- " + players.join('\n- ') + "\n";
const playbill_help = "Use the command `long live <name> the <title>!` to join the game! (ex: `Long Live Long-Live the Best Bot!`) \
You can use the command `exit!` to leave the game again. Once you've joined, react to choose your role:\n\
:ghost: The Grim | :crown: The Heir | :wine_glass: The Advisor | :church: The Bishop | :crossed_swords: The Captain | :game_die: Random\n\
";
exports.playbill_text = (title, state, players) => playbill_title(title) + playbill_tagline(state) + playbill_players(players) + (state == 'is beginning' ? playbill_help : '');
exports.playbill_title = playbill_title;

//VARS: RANDOM NAMES
const macbeth_names = ['Duncan', 'Malcolm', 'Donalbain', 'Macbeth', 'Lady Macbeth', 'Banquo', 'Fleance', 'Macduff', 'Lennox', 'Ross', 'Menteith', 'Angus', 'Caithness', 'Lady Macduff', 'Hecate', 'Young Siward', 'Seyton'];
const hamlet_names = ['Hamlet', 'Polonius', 'Rosencrantz', 'Guildenstern', 'Ophelia', 'Gertrude', 'Claudius', 'Horatio', 'Laertes', 'Fortinbras', 'Yorrick'];
exports.random_names = [].concat(macbeth_names,hamlet_names);

//VARS: LOCATIONS -> FACTION -> ROLE relationships
exports.locationToFaction = {'Throne':'Spirit','Courtyard':'Common','Ballroom':'Noble','Chapel':'Faithful','Barracks':'Guard'};
exports.roleToLocation = {'Grim':'Throne','Heir':'Courtyard','Advisor':'Ballroom','Bishop':'Chapel','Captain':'Barracks'};
exports.roleToFaction = {'Grim':'Spirit','Heir':'Common','Advisor':'Noble','Bishop':'Faithful','Captain':'Guard'};

//VARS: REACTIONS -> ROLES, REACTIONS -> LOCATIONS
exports.reactionToRole = {'👻':'Grim','👑':'Heir','🍷':'Advisor','⛪':'Bishop','⚔️':'Captain'};
exports.reactionToLocation = {'🪑':'Throne','🍻':'Courtyard','🥂':'Ballroom','🕯️':'Chapel','🛡️':'Barracks'};
exports.locationToReaction = {'Throne':'🪑','Courtyard':'🍻','Ballroom':'🥂','Chapel':'🕯️','Barracks':'🛡️'};
exports.locationReactions = ['🪑','🍻','🥂','🕯️','🛡️'];

//VARS: ACTION TYPES -> TIME COSTS
exports.actionToTime = {
    'visit':        0,
    'investigate':  1,
    'tell':         0,
    'propose':      2,
    'vote':         1,
    'hear':         1,
    'poison':       1,
    'laud':         1,
    'besmirch':     1,
    'pray':         3,
    'tithe':        1,
    'bribe':        1,
    'direct':       2,
    'suspect':      2,
    'accuse':       2,
    'support':      2,
    'claim':        3,
    'end':          0
}
//VARS: LOCATIONS -> ACTION TYPES
exports.locationToActions = {
	'throne': 	['visit','investigate','tell','end','propose','vote','hear'],
	'ballroom': ['visit','investigate','tell','end','poison','laud','besmirch'],
	'courtyard':['visit','investigate','tell','end','accuse','support','claim'],
	'chapel': 	['visit','investigate','tell','end','pray','tithe'],
	'barracks': ['visit','investigate','tell','end','direct','suspect','bribe']
}

//VARS: GLOBAL TWEAK VARIABLES
exports.startingInfluence = 40;
exports.startingCrowns = 100;
exports.thankBonus = 5;
exports.pressCost = 10;
exports.laudAmount = 20;
exports.laudBonus = 80;
exports.besmirchAmount = 10;
exports.besmirchPenalty = 80;
exports.titheRate = 0.5;
exports.bribeRate = 0.5;
exports.directCost = 60;
exports.suspectCost = 120;

//HELPERS: Title Case
exports.titleCase = (string) => {
    title = string.split(' ');
    for (t in title) {
        title[t] = title[t].charAt(0).toUpperCase() + title[t].slice(1);
    }
    return title.join(' ');
}

//HELPERS: Command parsing for complex wildcarded inline commands
const commandMatch = (command, key) => {
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
exports.commandMatch = commandMatch;

const commandArgs = (command, key) => {
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
exports.commandArgs = commandArgs;

//HELPERS: Random Choice
exports.randomPop = (array) => {
    //const random = Math.random();
    //console.log("length: " + array.length + " random: " + random + " floored: " + Math.floor(random * array.length));
    const result = array.splice(Math.floor(Math.random() * array.length),1);
    return result;
}

exports.randomChoice = (array) => {
    //uniform random selection from the given array - unforunately, tends to return as an object!
    return array.slice()[Math.floor(Math.random() * array.length)];
}

//HELPERS: Element of
exports.elem = (item,array) => {
	//console.log("TEST: Item: " + item + " Array: " + array);
	const answer = array.some((value, index, array) => value == item);
	//console.log("TEST: Answer: " + answer);
	return answer;
}

//HELPER: Time int to text
exports.timeText = (time) => {
    switch (time) {
        case 3: return "Morning";
        case 2: return "Afternoon";
        case 1: return "Evening";
        case 0: return "Night"
        default: return "ERROR: TIME OUT OF BOUNDS"
    }
}