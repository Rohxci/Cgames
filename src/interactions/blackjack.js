const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

/* cards */

const suits = ["♠","♥","♦","♣"];
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function createDeck(){

const deck=[];

for(const s of suits){
for(const r of ranks){
deck.push({rank:r,suit:s});
}
}

return deck.sort(()=>Math.random()-0.5);

}

function cardString(c){
return `${c.rank}${c.suit}`;
}

function handString(hand){
return hand.map(cardString).join(" ");
}

function value(hand){

let total=0;
let aces=0;

for(const c of hand){

if(["J","Q","K"].includes(c.rank)) total+=10;
else if(c.rank==="A"){
total+=11;
aces++;
}
else total+=parseInt(c.rank);

}

while(total>21 && aces>0){
total-=10;
aces--;
}

return total;

}

/* buttons */

function gameButtons(){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("bj_hit")
.setLabel("Hit")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("bj_stand")
.setLabel("Stand")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("bj_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Danger)

);

}

function resultButtons(){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("bj_again")
.setLabel("Play Again")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("bj_finish")
.setLabel("Finish Game")
.setStyle(ButtonStyle.Secondary)

);

}

module.exports={

match(interaction){

if(!interaction.isButton()) return false;

return interaction.customId.startsWith("bj_");

},

async run(interaction){

const id = interaction.customId;

/* START */

if(id.startsWith("bj_start_")){

const player = id.split("_")[2];

if(interaction.user.id!==player){
return interaction.reply({content:"Only the player can start.",ephemeral:true});
}

const deck=createDeck();

const playerHand=[deck.pop(),deck.pop()];
const dealerHand=[deck.pop(),deck.pop()];

games.create(interaction.channelId,{
type:"blackjack",
player,
deck,
playerHand,
dealerHand,
plays:1
});

const embed=createEmbed(
"♠️ Blackjack",
`You
${handString(playerHand)}
Value: ${value(playerHand)}

Dealer
${cardString(dealerHand[0])} ?

Round 1 / 10`
);

await interaction.update({
embeds:[embed],
components:[gameButtons()]
});

return;

}

/* CANCEL */

if(id.startsWith("bj_cancel_")){

const player = id.split("_")[2];

if(interaction.user.id!==player){
return interaction.reply({content:"Only the player can cancel.",ephemeral:true});
}

await interaction.update({
embeds:[createEmbed("❌ Blackjack","Game cancelled.")],
components:[]
});

return;

}

/* GET GAME */

const game = games.get(interaction.channelId);
if(!game || game.type!=="blackjack") return;

if(interaction.user.id!==game.player){
return interaction.reply({content:"You are not in this game.",ephemeral:true});
}

/* HIT */

if(id==="bj_hit"){

const card=game.deck.pop();
game.playerHand.push(card);

const val=value(game.playerHand);

if(val>21){

const text=`You
${handString(game.playerHand)}
Value: ${val}

💥 Bust

Dealer wins

Round ${game.plays} / 10`;

await interaction.update({

embeds:[createEmbed("♠️ Blackjack Result",text)],
components: game.plays>=10 ? [] : [resultButtons()]

});

if(game.plays>=10) games.delete(interaction.channelId);

return;

}

const embed=createEmbed(
"♠️ Blackjack",
`You
${handString(game.playerHand)}
Value: ${val}

Dealer
${cardString(game.dealerHand[0])} ?

Round ${game.plays} / 10`
);

await interaction.update({
embeds:[embed],
components:[gameButtons()]
});

return;

}

/* STAND */

if(id==="bj_stand"){

let dealerVal=value(game.dealerHand);

while(dealerVal<17){
game.dealerHand.push(game.deck.pop());
dealerVal=value(game.dealerHand);
}

const playerVal=value(game.playerHand);

let result;

if(dealerVal>21) result="🎉 You win (dealer bust)";
else if(dealerVal>playerVal) result="Dealer wins";
else if(playerVal>dealerVal) result="🎉 You win";
else result="Push";

const text=`You
${handString(game.playerHand)}
Value: ${playerVal}

Dealer
${handString(game.dealerHand)}
Value: ${dealerVal}

${result}

Round ${game.plays} / 10`;

await interaction.update({

embeds:[createEmbed("♠️ Blackjack Result",text)],
components: game.plays>=10 ? [] : [resultButtons()]

});

if(game.plays>=10) games.delete(interaction.channelId);

return;

}

/* SURRENDER */

if(id==="bj_surrender"){

const text=`🏳️ You surrendered

Dealer wins

Round ${game.plays} / 10`;

await interaction.update({

embeds:[createEmbed("♠️ Blackjack Result",text)],
components: game.plays>=10 ? [] : [resultButtons()]

});

if(game.plays>=10) games.delete(interaction.channelId);

return;

}

/* PLAY AGAIN */

if(id==="bj_again"){

game.plays++;

if(game.plays>10){

games.delete(interaction.channelId);

return interaction.update({

embeds:[createEmbed(
"♠️ Blackjack",
"You played 10 rounds.\n\nStart a new game with /blackjack."
)],
components:[]

});

}

/* new round */

const deck=createDeck();

game.deck=deck;
game.playerHand=[deck.pop(),deck.pop()];
game.dealerHand=[deck.pop(),deck.pop()];

const embed=createEmbed(
"♠️ Blackjack",
`You
${handString(game.playerHand)}
Value: ${value(game.playerHand)}

Dealer
${cardString(game.dealerHand[0])} ?

Round ${game.plays} / 10`
);

await interaction.update({
embeds:[embed],
components:[gameButtons()]
});

return;

}

/* FINISH */

if(id==="bj_finish"){

games.delete(interaction.channelId);

await interaction.update({

embeds:[createEmbed(
"♠️ Blackjack",
"Game finished."
)],
components:[]

});

}

}

};
