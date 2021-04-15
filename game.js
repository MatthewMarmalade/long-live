const helper = require('./helper.js');
const Location = require('./location.js');
const Day = require('./day.js');
const News = require('./news.js');
const Player = require('./player.js');
const Action = require('./action.js');
const AI = require('./ai.js');

//CLASS: Game, a complex class containing a full game.
module.exports = class Game {
    //constructor - when game is first initialized by the owner
    constructor(main_channel, main_message, title, owner) {
        console.log("New Game: The " + title + " Is Dead! Owner: " + owner.username);
        this.main_channel = main_channel; this.main_message = main_message; this.title = title; this.owner = owner;
        this.players = []; this.ais = []; this.characters = [];
        this.state = 'is beginning';
        this.random_names = helper.random_names.slice();
        this.day = new Day(0,this);
        this.throne = new Location('Throne',this); this.courtyard = new Location('Courtyard',this); this.ballroom = new Location('Ballroom',this);
        this.chapel = new Location('Chapel',this); this.barracks = new Location('Barracks',this);
        this.locations = [this.throne,this.courtyard,this.ballroom,this.chapel,this.barracks];
        this.roles = {'Grim':null,'Heir':null,'Advisor':null,'Bishop':null,'Captain':null,'Mysterious':[]};
        this.actions = {};
    }
    //randomName - returns a random unique name for a player.
    randomName() {
        if (this.random_names.length == 0) {
            this.random_names = helper.random_names.slice();
        }
        return helper.randomPop(this.random_names);
    }
    //mainText - renders the game into a piece of text in the main channel
    mainText() { return helper.playbill_text(this.title, this.state, this.playerTexts()); }
    //exuentText - renders the game into a short message marking a closed game.
    exuentText() { return helper.playbill_title(this.title) + "*A game of text-based intrigue and betrayal has been cancelled successfully.*"; }
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
                if (this.players[i].name == name || this.players[i].user == user) { return false; }
            }
            let new_player = new Player(user, name, title, this);
            this.players.push(new_player);
            return true;
        } else { return false; } //too many players, can't add any new ones!
    }

    //removePlayer - removes a player from the game (if they are in the game)
    removePlayer(user) {
        //let index = this.players.indexOf(player);
        if (this.state != 'is beginning') {
            console.log("ERROR: Should not remove a player while the game is not beginning, or else handle this eventuality!");
            return;
        }
        var player = this.getPlayerByUser(user);
        if (player != null) {
            if (player.role == 'Mysterious') {
                this.roles['Mysterious'].splice(this.roles['Mysterious'].indexOf(player),1);
            } else if (player.role != null) {
                this.roles[player.role] = null;
            }
            if (player.reaction != null) { player.reaction.users.remove(player.user.id); }
            this.players.splice(this.players.indexOf(player),1);
            return true;
        }
        return false; //if the player is not in the game
    }

    //getPlayerByUser - returns the player corresponding to the discord user or null otherwise
    getPlayerByUser(user) {
        for (var i in this.players) {
            if (this.players[i].user.id == user.id) {
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
            if (character.name.toString().toLowerCase() == name || character.fullName().toLowerCase() == name || character.role.toLowerCase() == name) {
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
    exuent(gamesByUser) {
        console.log("LOG: Game:Exuent:This doesn't do anything?")
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
                this.actions[this.players[i].name] = [];
            }
            //with the roles we have left and the players who need them identified, zip together.
            for (var m in mysteries) {
                var role = helper.randomPop(rolesRemaining);
                mysteries[m].setRole(role);
                this.roles[role] = mysteries[m]
            }
            this.roles['Mysterious'] = [];

            //now we need to add ais to fill in whatever space is missing.
            for (var a = 0; a < 5 - this.players.length; a++) {
                const new_role = helper.randomPop(rolesRemaining);
                var new_ai = new AI(this.randomName(), "Their Majesty", this, new_role);
                this.ais.push(new_ai); this.characters.push(new_ai);
                this.actions[new_ai.name] = [];
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
        }// after this point, we know that all players are ready. Now, the AI take their turns.

        for (var a in this.ais) {
            var ai = this.ais[a];
            //dawn - nothing, as they don't respond to news yet

            //morning - location and then nothing, as they don't respond to news yet and we don't understand mornings yet

            //afternoon - a standard action they can do, though now flavored as choosing a location and then an action

            //evening - a special action, based on influence

            //night - nothing, as ais are good upstanding citizens

            var timeLeft = true;
            while (timeLeft) {
                let action = ai.randomAction();
                console.log("LOG: Looping - make sure does not break! AI: " + ai.name + ", Action: " + action.type);
                if (action.type == 'end') {
                    timeLeft = false;
                } else if (action.type == 'visit') {
                    ai.location = action.destination;
                } else {
                    this.actions[ai.name].push(action);
                    ai.time -= action.time;
                    let news = new News(this.day,ai.time,ai.location,ai,action,action,action.flavor());
                    this.day.news.push(news);
                }
            }
            ai.time = 1;
        }//all ai events should be in place now

        console.log("LOG: Clearing Actions");
        this.clearActions();

        console.log("LOG: Clearing News - moving news to locations and players.");
        this.clearNews();

        //sending money if a proposal finished
        if (this.proposal) {
        	if (this.proposal.deadline == this.day.day) {
        		console.log("LOG: Proposal: " + this.proposal.toText() + " FINISHED. Result: ");
        		this.proposal.payout()
        		this.proposal = null;
        	} else {
        		console.log("LOG: Proposal: " + this.proposal.toText() + " is not yet finished, " + this.proposal.deadline - this.day.day + " days remaining.");
        	}
        }

        //updating day
        this.day = this.day.nextDay();

        console.log("LOG: Sending updates to players for the next day.");
        for (var i in this.players) {
            var player = this.players[i];
            player.next = false;
            player.time = 3;
            var newsTexts = player.wakeNews();
            var newsUpdate = '** NEWS ** *Whispers filter in at 10th bell about the movements of others the previous day...*\n-' + 
            newsTexts.join('\n-');
            player.user.send(player.dayHeader())
                .then(sentMessage => player.dayMessage = sentMessage);
            player.user.send(newsUpdate);
            player.user.send(player.stateText())
                .then(sentMessage => player.stateMessage = sentMessage)
                .then(() => player.stateMessage.react(helper.locationReactions[0]))
                .then(() => player.stateMessage.react(helper.locationReactions[1]))
                .then(() => player.stateMessage.react(helper.locationReactions[2]))
                .then(() => player.stateMessage.react(helper.locationReactions[3]))
                .then(() => player.stateMessage.react(helper.locationReactions[4]))
                .catch(console.error);
        }
    }

    //clearActions - parses all the actions that have accumulated over the day, enacting their effects.
    clearActions() {
        for (var c in this.characters) {
            var character = this.characters[c];
            console.log("LOG: Clearing " + this.actions[character.name].length + " Actions For Character " + character.name);
            //console.log(this.actions[character.name])
            for (var a in this.actions[character.name]) {
                let action = this.actions[character.name][a];
                switch (action.type) {
                    case 'thank': character.crowns -= action.crowns; character.influence[action.location.faction.toLowerCase()] += helper.thankBonus; break;
                    case 'press': character.crowns -= action.crowns; character.influence[action.location.faction.toLowerCase()] -= helper.pressCost; break;
                    case 'propose': this.newProposal(action,character); break;
                    case 'vote': this.addVote(action.vote,character); break;
                    case 'hear': character.petitions.push(action.location.factionPetition()); break;
                    case 'poison': this.ballroom.poison(); break;
                    case 'laud': action.character.influence.noble += helper.laudAmount; break;
                    case 'besmirch': action.character.influence.noble -= helper.besmirchAmount; break;
                    case 'tithe': character.crowns -= action.crowns; character.influence.faithful += action.crowns * helper.titheRate; break;
                    case 'bribe': character.crowns -= action.crowns; character.influence.guard += action.crowns * helper.bribeRate; break;
                    case 'direct': character.influence.guard -= helper.directCost; action.location.direct(); break;
                    case 'suspect': character.influence.guard -= helper.suspectCost; break;
                    case 'accuse': this.newAccusation(action,character); break;
                    case 'support': character.support(action.character); break;
                    case 'claim': this.newClaim(character); break;
                }
            }
            this.actions[character.name] = [];
        }
    }

    //clearNews - parses all the news that has accumulated over the day, enacting their effects.
    //specifically, moves the news to people (to be sent when they 'awake') and places (to be found when they 'arrive')
    clearNews() {
        for (var p in this.players) {
        	this.players[p].news = [];
        }
        for (var n in this.day.news) {
            var news = this.day.news[n];
            //iterate on news type and 
            //for now, all news goes to all players? for to test?
            for (var p in this.players) {
            	this.players[p].news.push(news);
            }
        }
    }

    //newAction - parses a player's message into actions and returns a response, else returns null if the command is invalid
    newAction(player, truth, lie, flavor) {
        //need to get an action object
        console.log("LOG: Instantiating: " + player.name + " [" + truth + " | " + lie + "] " + '"' + flavor + '"');
        if (true == null || lie == null) { console.log("LOG: Invalid action instantiation: " + truth); return false; }
        var trueAction = Action.newAction(this,truth,player);
        if (trueAction == null) { console.log("LOG: Invalid action instantiation: " + truth); return false; }
        var lieAction = truth != lie ? Action.newAction(this,lie,player) : trueAction;
        if (lieAction == null) { console.log("LOG: Invalid action instantiation: " + lie); return false; }

        //test for validity
        console.log("LOG: Player Time: " + player.time + " - Action Time: " + trueAction.time);
        if (player.time < trueAction.time) {
            console.log("LOG: Invalid action: Not enough time: (" + player.time + "<" + trueAction.time + ")");
            return false;
        }
        if (!helper.elem(trueAction.type,helper.locationToActions[player.location.lower])) {
            console.log("LOG: Invalid action: Incorrect location: (" + trueAction.type + " !elem " + helper.locationToActions[player.location.lower]);
            return false;
        }

        //add action to list to execute at the end of the day
        this.actions[player.name].push(trueAction);

        //insert news of the action
        var news = new News(this.day, player.time, player.location, player, trueAction, lieAction, flavor);
        console.log("Created news: " + news.all());
        this.day.news.push(news);

        //update player time
        player.time -= trueAction.time

        //get appropriate response
        const response = trueAction.response(player);

        if (trueAction.type == 'end') {
            player.next = true;
            player.location = player.home;
            player.user.send(response);
        } else {
            player.stateMessage.delete();
            player.user.send(response);
            player.user.send(player.stateText())
                .then(sentMessage => player.stateMessage = sentMessage)
                .then(() => player.stateMessage.react(helper.locationReactions[0]))
                .then(() => player.stateMessage.react(helper.locationReactions[1]))
                .then(() => player.stateMessage.react(helper.locationReactions[2]))
                .then(() => player.stateMessage.react(helper.locationReactions[3]))
                .then(() => player.stateMessage.react(helper.locationReactions[4]))
                .catch(console.error);
        }

        return true;
    }
    //newReaction - parses a player's reaction into an action undertaken.
    newReaction(player, reaction) {
        //console.log(reaction);
        console.log("LOG: Instantiating " + player.name + " reaction: " + reaction._emoji.name);
        //so, first of all we just want to handle visiting.
        const destinationText = helper.reactionToLocation[reaction._emoji.name];
        var destination = this.getLocationByName(destinationText);
        if (destination != null) {
            //perform the move!
            player.location = destination;
            reaction.message.edit(player.stateText());
        }
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
    //newAccusation
    newAccusation(action,character) {
        console.log("ERROR: NOT TESTED");
        if (character.beenAccused) {
            console.log("LOG: CANNOT ACCUSE SAME CHARACTER " + character.name + " MORE THAN ONCE");
            return null;
        }
        if (this.accusation != null) {
            console.log("LOG: CANNOT HAVE MULTIPLE ACCUSATIONS IN THE SAME DAY, CHOOSES HIGHER COMMON");
            if (accusation.accuser.influence.common < character.influence.common) {
                console.log("LOG: " + character.name + " HAD MORE INFLUENCE, DISLODGING CURRENT ACCUSATION");
                this.accusation = new Accusation(character,action.character);
            } else { console.log("LOG: " + accusation.accuser.name + " HAD MORE INFLUENCE, RETAINING ACCUSATION");}
        } else {
            console.log("LOG: NEW ACCUSATION BY " + character.name + " OF " + action.character.name);
            this.accusation = new Accusation(character,action.character);
        }
    }
    //newClaim
    newClaim(character) {
        console.log("ERROR: NOT IMPLEMENTED.");
    }
}

//CLASS: Proposal - represents a proposal in the kingdom
class Proposal {
    constructor(crowns,location,game,proposer,deadline) {
        this.crowns = crowns; this.location = location; this.game = game; this.proposer = proposer; this.deadline = deadline;
        this.votes = {yea:[],nay:[]};
    }
    toText() {
    	return this.crowns + " tax of " + this.location.toText();
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
            if (this.votes.yea[y].fullName() == character.fullName()) { console.log("ERROR: Character " + character.name + " has already voted 'Yea'!"); return true; }
        }
        for (var n in this.votes.nay) {
            if (this.votes.nay[n].fullName() == character.fullName()) { console.log("ERROR: Character " + character.name + " has already voted 'Nay'!"); return true; }
        }
        console.log("Character " + character.name + " has not voted, their vote can now be registered.");
        return false;
    }
    result() {
    	if (this.votes.yea.length > this.votes.nay.length) {
    		return 'yea';
    	} else {
    		return 'nay';
    	}
    }
    payout() {
    	var share;
    	for (var c in this.game.characters) {
    		var character = this.game.characters[c];
    		if (character.role == 'Grim') {
    			//grim gets nothing
    			share = 0;
    		} else if (character.fullName() == this.proposer.fullName() || character.role == 'Advisor') {
    			if (character.fullName() == this.proposer.fullName() && character.role == 'Advisor') {
    				//advisor and proposer gets 40%
    				share = Math.round(0.4 * this.crowns);
    			} else {
    				//advisor xor proposer gets 30%
    				share = Math.round(0.3 * this.crowns);
    			}
    		} else {
    			//all others get 20%
    			share = Math.round(0.2 * this.crowns);
    		}
    		console.log("LOG: " + character.fullName() + " receives " + share + " crowns!");
    		character.crowns += share;
    	}
    }
}

class Accusation {
    constructor(accuser, accused) {
        this.accuser = accuser; this.accused = accused;
    }
}