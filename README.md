# Long Live
An asymmetric shakespearean text-based competitive social rpg of limited information.

## Intentions
The previous monarch has died of oddly bloody natural causes. Players navigate the castle, interact with each other, attempt to garner influence with the various factions, and if they can find time for it amidst all the social backstabbing, try to find the *literal* backstabber of the last person who held the throne. Play proceeds along a number of days in which actions are taken asynchronously; at the beginning of the next day everyone hears about each other's actions.  

Begin and join a game in a server channel. Primary play is carried out in a dm with the bot. Play is in as natural-language a form as possible. Commands to perform actions are explicit; however players are strongly encouraged to also roleplay their characters in natural language and are slightly rewarded for doing so. Deception is also a major component; because the players are hearing about each other's actions through the lens of the bot, there is ample opportunity to mislead each other as to their true actions.  

[Full Design Brief](https://docs.google.com/document/d/1ni27LwPuuAySAL9iAafapMvhsofkjvguhH7wtULzMRs/)

## To Do
### Setup
- ~~Role Choices - messageReactionAdd~~
- ~~Role Switching~~
- ~~Role Leaving - messageReactionRemove~~
- ~~Random Role Choice~~

### Basic Game
- ~~Taking actions~~
- ~~Day progress action~~
- ~~Player inventory: influence, money, time.~~
- ~~Rudimentary inventory display~~
- ~~AI action choices~~
- Actions need to be more costly - should be doing less in a day. Map out. (emoji visiting? 3/day? longer durations on things?)
- Newsiness and ranking and corruption
- News -> Influence updates
- Enacting Proposals and Votes
- Fulfilling Petitions
- Special Proposals - accusations and claiming.

### Advanced Game
- Tracking location and available actions display
- Smarter AI action choices
- AI supporting and disliking
- Playbooks
- Game alerts, like news but game-generated.
- Command shortcuts for those who prefer not to type quite as much?

### Additional
- Help functions
- Highlights (a little idea)
- Events (heightening, probably needs some AI playtests to configure) (connects well to the october dates chosen...)
- Map (could be lots of fun! probably primarily static?)

### Important/Bugs
- Should react to failed commands with a question mark, so that users can elect to receive an error message pmed? is that a sane amount of information to track?
