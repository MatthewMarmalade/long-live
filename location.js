const helper = require('./helper.js');
const randomChoice = helper.randomChoice;
//CLASS: Location, a class representing a part of the castle
module.exports = class Location {
    constructor(location, game) {
        this.game = game;
        if (location == 'Throne' || location == 'Courtyard' || location == 'Ballroom' || location == 'Chapel' || location == 'Barracks') {
            this.location = location;
        } else {
            console.log("ERROR: NON-STANDARD LOCATION - TRACE");
            this.location = 'Courtyard';
        }
        this.faction = helper.locationToFaction[this.location];
        this.lower = this.location.toLowerCase();
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

    //poison - make the current location poison anyone who visits.
    poison() {
        if (this.location != 'Ballroom') { return null; }
        this.poisoned = true;
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