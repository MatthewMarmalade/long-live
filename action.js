const helper = require('./helper.js');
const commandMatch = helper.commandMatch;
const commandArgs = helper.commandArgs;
const randomChoice = helper.randomChoice;

//HELPER: newAction - creates an action out of action text
newAction = (game,actionText,actor) => {
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
        return new Thank(crowns, actor.location);
    } else if (commandMatch(text, '[press *]')) {
        const crowns = commandArgs(text, '[press *]')[0];
        if (isNaN(crowns)) { console.log("ERROR: '" + crowns + "' is not a number!"); return null; }
        return new Press(crowns, actor.location);
    } else if (commandMatch(text, '[pay * to *]')) {
        var args = commandArgs(text, '[pay * to *]');
        const crowns = args[0]; const playerName = args[1];
        var player = game.getCharacterByName(playerName);
        if (player == null) { console.log("ERROR: '" + playerName + "' is not a player!"); return null; }
        if (isNaN(crowns)) { console.log("ERROR: '" + crowns + "' is not a number!"); return null; }
        return new Pay(crowns,player);
    } else if (text == '[end day]') {
        return new End(actor.time);
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
        return new Hear(location,actor);
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

//CLASS: ACTION - CURRENTLY UNUSED, MAY GET TURNED INTO A PROTOTYPE?
// class Action {
//     constructor(type, destination, character, crowns) {
//         this.type = type;
//         this.destination = destination;
//         this.character = character;
//         this.crowns = crowns;
//         this.time = helper.actionToTime[this.type];
//     }
// }

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
    constructor(crowns, location) {this.type = 'thank'; this.crowns = crowns; this.location = location; this.time = 0; this.origin = 'any'; }
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
    constructor(crowns, location) {this.type = 'press'; this.crowns = crowns; this.location = location; this.time = 0; this.origin = 'any'; }
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

module.exports = {
    newAction,
    Visit,
    Investigate,
    Thank,
    Press,
    Pay,
    Propose,
    Vote,
    Hear,
    Poison,
    Laud,
    Besmirch,
    Pray,
    Tithe,
    Bribe,
    Direct,
    Suspect,
    Accuse,
    Support,
    Claim,
    End
};