//CLASS: Day, a class representing a day
module.exports = class Day {
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