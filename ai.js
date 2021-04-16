const helper = require('./helper.js');
const Action = require('./action.js');
const randomChoice = helper.randomChoice;

module.exports = class AI { //similar API to player
    //constructor: when a game starts without all five players
    constructor(name, title, game, role) {
        this.name = name; this.title = title; this.game = game; this.role = role.toString(); this.home = game.getLocationByName(helper.roleToLocation[role]);
        this.location = this.home;
        this.influence = {common:0,noble:0,faithful:0,guard:0};
        this.influence[helper.roleToFaction[role].toLowerCase()] = helper.startingInfluence;
        //console.log("LOWERCASE TEST: " + role);
        if (this.role.toLowerCase() == 'bishop') {
            this.influence.faithful = helper.startingInfluence * 2;
        }
        this.crowns = helper.startingCrowns; this.time = 0; this.beenAccused = false;
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
       return new Action.End(this.time);
    }
    //randomAction - returns a random viable action based on role and location
    randomAction() {
        var action;
        const role = this.role.toLowerCase();
        switch (this.location.location.toLowerCase()) {
            case 'throne': 
            if (role == 'advisor' && randomChoice([0,1,1]) == 1) {
                action = new Action.Propose(randomChoice([100,150,200,300]),randomChoice([this.game.courtyard,this.game.chapel,this.game.barracks]));
            } break;
            case 'courtyard': break;
            case 'ballroom': 
            if (role != 'captain' && role != 'grim' && randomChoice([0,1,1]) == 1) {
                action = new Action.Laud(randomChoice(this.game.characters));
            } break;
            case 'chapel':
            if (role != 'captain' && randomChoice([0,1,1]) == 1) {
                action = new Action.Pray();
            } break;
            case 'barracks': break;
        }
        if (action == null) {
            action = randomChoice([0,0,1]) == 1 ? this.randomVisit() : new Action.Investigate(randomChoice(this.game.characters));
        }
        if (action.time <= this.time) {
            return action;
        } else {
            return new Action.End(this.time);
        }
    }
    // //execute - runs the effect of an action
    // execute(action) {
    //     if (this.time >= action.time) {
    //         //we have enough time remaining
    //         if (action.origin == 'any' || action.origin == this.location) {
    //             //we are in the right place
    //             const valid = action.execute(this)
    //             if (valid) {
    //                 //the action executed, can update time
    //                 this.time -= action.time;
    //                 return true;
    //             } else { console.log("FAILED ACTION: " + action.type + ", " + valid); return false; }
    //         } else { console.log("WRONG LOCATION: HAVE " + this.location + " NEEDS: " + action.origin); return false; }
    //     } else { console.log("NOT ENOUGH TIME REMAINING: HAVE " + this.time + " NEEDS: " + action.time); return false; }
    // }

    //randomVisit - produces a visit action targetting some non-here place.
    randomVisit() {
        var notHere;
        switch (this.location.location.toLowerCase()) {
            case 'throne':    notHere = randomChoice([this.game.courtyard,this.game.ballroom,this.game.chapel,this.game.barracks]); break;
            case 'courtyard': notHere = randomChoice([this.game.throne,this.game.ballroom,this.game.chapel,this.game.barracks]); break;
            case 'ballroom':  notHere = randomChoice([this.game.throne,this.game.courtyard,this.game.chapel,this.game.barracks]); break;
            case 'chapel':    notHere = randomChoice([this.game.throne,this.game.courtyard,this.game.ballroom,this.game.barracks]); break;
            case 'barracks':  notHere = randomChoice([this.game.throne,this.game.courtyard,this.game.ballroom,this.game.chapel]); break;
        }
        return new Action.Visit(notHere);
    }
    //getRelevantNewsTexts - doesn't really need to be implemented as nothing is ever sent to them.
    getRelevantNewsTexts(news) {
        //error?
        console.log("ERROR: Should not try to send a bot any news!");
    }
}