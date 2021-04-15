const helper = require('./helper.js');
const Action = require('./action.js');

//CLASS: Player, a class representing a player in a game
module.exports = class Player {
    //constructor - when a player joins a game
    constructor(user, name, title, game) {
        this.user = user; this.name = name; this.title = title; this.game = game;
        this.influence = {common:0,noble:0,faithful:0,guard:0};
        this.crowns = helper.startingCrowns; this.time = 0; this.next = true;
        this.news = [];
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
    //dayHeader - formats the various currencies into a piece of starting text.
    dayHeader() {
        return '--------------------\n' + 
        '**Date**: ' + this.game.day.toText() + '\n' + 
        '**Coffers**: ' + this.crowns + ' crowns' + '\n' +
        '**Common Support**: ' + this.influence.common + '\n' +
        '**Noble Regard**: ' + this.influence.noble + '\n' +
        '**Faithful Devotion**: ' + this.influence.faithful + '\n' +
        '**Guard Loyalty**: ' + this.influence.guard + '\n';
    }
    //stateText - formats the various currencies etc. into a piece of update text.
    stateText() {
        return "It is " + helper.timeText(this.time) + 
        ". You are in " + this.location.toText() + ".";
    }
    //setRole - gives this player a role
    setRole(role) {
        this.role = role.toString();
        this.home = this.game.getLocationByName(helper.roleToLocation[role]);
        this.location = this.home;
        this.influence[this.home.faction.toLowerCase()] = helper.startingInfluence;
        if (this.role.toLowerCase() == 'bishop') {
            this.influence.faithful = helper.startingInfluence * 2;
        }
    }
    firstAction() {
        return new Action.End(this.time);
    }
    wakeNews() {
    	//news heard when a player wakes up
    	var texts = [];
    	for (var n in this.news) {
    		if (this.news[n].lie.type != 'visit') {
    			texts.push(this.news[n].toText())
    		}
    	}
    	return texts.slice(0,10);
    //         if (news[n].player != this && news[n].lie.type != 'visit') {
    //             texts.push(news[n].noTruth());
    //         }
    //     }
    }
    // getRelevantNewsTexts(news) {
    //     var texts = [];
    //     for (var n in news) {
    //         if (news[n].player != this && news[n].lie.type != 'visit') {
    //             texts.push(news[n].noTruth());
    //         }
    //     }
    //     return texts.slice(0,5);
    // }
    // //execute - executes the action's effect on the player. returns whether the action was valid or not.
    // execute(action) {
    //     if (this.time >= action.time) {
    //         //we have enough time remaining
    //         if (action.origin == 'any' || action.origin == this.location.location.toLowerCase()) {
    //             //we are in the right place
    //             const valid = action.execute(this)
    //             if (valid) {
    //                 //the action executed, can update time
    //                 this.time -= action.time;
    //                 return true;
    //             } else { console.log("FAILED ACTION: " + action.type + ", " + valid); return false; }
    //         } else { console.log("WRONG LOCATION: HAVE " + this.location.location + " NEEDS: " + action.origin); return false; }
    //     } else { console.log("NOT ENOUGH TIME REMAINING: HAVE " + this.time + " NEEDS: " + action.time); return false; }
    // }
}