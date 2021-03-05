const helper = require('./helper.js');
const timeText = helper.timeText;
//CLASS: News, a class representing a piece of news in a game.
module.exports = class News {
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